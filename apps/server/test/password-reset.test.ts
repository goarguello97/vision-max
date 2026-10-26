import { createHash } from 'node:crypto';
import { AUTH_MESSAGES } from '@vision-max/shared';
import { describe, expect, it, vi } from 'vitest';
import { sequelize } from '../src/db/sequelize';
import { sendPasswordResetMail } from '../src/modules/auth/mail';
import { User } from '../src/modules/auth/models';
import {
  api,
  createGoogleOnlyUser,
  login,
  me,
  nowSec,
  refresh,
  registerUser,
  signAccessToken,
} from './helpers';

// Spec 01: E7 a E9. Gherkin "Recuperar contraseña por email" y "Restablecer contraseña".

const sendMail = vi.mocked(sendPasswordResetMail);
const forgot = (email: string) => api().post('/api/auth/forgot-password').send({ email });
const validate = (token: string) => api().get('/api/auth/reset-password/validate').query({ token });
const reset = (token: string, password: string) => api().post('/api/auth/reset-password').send({ token, password });

// E7 responde antes de procesar: se espera a que el mock del mail reciba la llamada.
async function requestResetToken(email = 'gonza@mail.com', calls = 1) {
  expect((await forgot(email)).status).toBe(202);
  await vi.waitFor(() => expect(sendMail).toHaveBeenCalledTimes(calls));
  const { link } = sendMail.mock.calls[calls - 1]![0];
  return new URL(link).searchParams.get('token')!;
}

// Da tiempo al procesamiento en segundo plano cuando se espera que NO se mande nada.
const settle = () => new Promise((resolve) => setTimeout(resolve, 300));

describe('POST /api/auth/forgot-password (E7)', () => {
  it('manda un link de 60 minutos a una cuenta existente', async () => {
    await registerUser();
    const res = await forgot('Gonza@mail.com');

    expect(res.status).toBe(202);
    expect(res.body).toEqual({ message: AUTH_MESSAGES.forgotPasswordSent });
    await vi.waitFor(() => expect(sendMail).toHaveBeenCalledOnce());
    expect(sendMail.mock.calls[0]![0]).toMatchObject({
      to: 'gonza@mail.com',
      firstName: 'Gonzalo',
      username: 'gonza_97',
      ttlMin: 60,
      link: expect.stringMatching(/^http:\/\/localhost:5173\/restablecer-contrasena\?token=[\w-]{43}$/),
    });
  });

  it('responde exactamente igual si la cuenta no existe y no manda nada (RN-26)', async () => {
    const res = await forgot('noexiste@mail.com');
    await settle();

    expect(res.status).toBe(202);
    expect(res.body).toEqual({ message: AUTH_MESSAGES.forgotPasswordSent });
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('solo responde 400 si el formato del email es inválido', async () => {
    const res = await forgot('no-es-email');
    expect(res.status).toBe(400);
  });

  it('guarda el token hasheado con vencimiento a 60 minutos (RN-27)', async () => {
    await registerUser();
    const token = await requestResetToken();
    const [rows] = await sequelize.query(
      'SELECT token_hash, round(extract(epoch FROM expires_at - created_at) / 60) AS minutes FROM password_reset_tokens',
    );

    expect(rows).toEqual([{ token_hash: createHash('sha256').update(token).digest('hex'), minutes: '60' }]);
  });

  it('después de 3 pedidos en una hora mantiene la respuesta pero no manda más mails (RN-28)', async () => {
    await registerUser();
    for (let i = 1; i <= 3; i++) await requestResetToken('gonza@mail.com', i);

    const res = await forgot('gonza@mail.com');
    await settle();

    expect(res.status).toBe(202);
    expect(res.body.message).toBe(AUTH_MESSAGES.forgotPasswordSent);
    expect(sendMail).toHaveBeenCalledTimes(3);
  });
});

describe('GET /api/auth/reset-password/validate (E8)', () => {
  it('confirma un link válido con el email enmascarado', async () => {
    await registerUser();
    const res = await validate(await requestResetToken());

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ valid: true, email: 'g***@mail.com' });
  });

  it('pedir un link nuevo invalida el anterior (RN-27)', async () => {
    await registerUser();
    const first = await requestResetToken('gonza@mail.com', 1);
    const second = await requestResetToken('gonza@mail.com', 2);

    expect((await validate(first)).status).toBe(410);
    expect((await validate(second)).status).toBe(200);
  });

  it('un link vencido responde RESET_TOKEN_INVALID', async () => {
    await registerUser();
    const token = await requestResetToken();
    await sequelize.query("UPDATE password_reset_tokens SET expires_at = now() - interval '1 second'");

    const res = await validate(token);
    expect(res.status).toBe(410);
    expect(res.body.error.code).toBe('RESET_TOKEN_INVALID');
  });

  it.each(['inexistente', ''])('un token "%s" responde RESET_TOKEN_INVALID', async (token) => {
    expect((await validate(token)).status).toBe(410);
  });
});

describe('POST /api/auth/reset-password (E9)', () => {
  it('cambia la contraseña, cierra todas las sesiones y no inicia sesión (RN-31)', async () => {
    const notebook = await registerUser();
    const phone = await login();
    const token = await requestResetToken();
    const issuedBefore = signAccessToken(notebook.user.id, { iat: nowSec() - 60 });

    const res = await reset(token, 'nuevaClave2026');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: AUTH_MESSAGES.passwordUpdated });
    expect(res.headers['set-cookie']).toBeUndefined();

    // Refresh revocados en todos los dispositivos y access tokens previos rechazados (caso borde 9).
    expect((await refresh(notebook.rt)).body.error.code).toBe('SESSION_REVOKED');
    expect((await refresh(phone.rt)).body.error.code).toBe('SESSION_REVOKED');
    expect((await me(issuedBefore)).status).toBe(401);

    expect((await api().post('/api/auth/login').send({ email: 'gonza@mail.com', password: 'peliculas2026' })).status).toBe(401);
    expect((await login('gonza@mail.com', 'nuevaClave2026')).user.username).toBe('gonza_97');
  });

  it('el link es de un solo uso', async () => {
    await registerUser();
    const token = await requestResetToken();
    await reset(token, 'nuevaClave2026');

    const again = await reset(token, 'otraClave2027');
    expect(again.status).toBe(410);
    expect((await validate(token)).status).toBe(410);
  });

  it('rechaza la contraseña actual (RN-32)', async () => {
    await registerUser();
    const res = await reset(await requestResetToken(), 'peliculas2026');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatchObject({ code: 'SAME_PASSWORD', fields: { password: AUTH_MESSAGES.samePassword } });
  });

  it('aplica la política de contraseña y la regla email/ID', async () => {
    await registerUser();
    const token = await requestResetToken();

    expect((await reset(token, 'corta1')).body.error.fields.password).toBe(AUTH_MESSAGES.passwordPolicy);
    expect((await reset(token, 'Gonza_97')).body.error.fields.password).toBe(AUTH_MESSAGES.passwordEqualsIdentity);
  });

  it('un link reemplazado no sirve para restablecer', async () => {
    await registerUser();
    const first = await requestResetToken('gonza@mail.com', 1);
    await requestResetToken('gonza@mail.com', 2);

    expect((await reset(first, 'nuevaClave2026')).status).toBe(410);
  });

  it('una cuenta solo-Google crea su contraseña y puede usar ambos métodos (RN-30)', async () => {
    await createGoogleOnlyUser({ email: 'cinefila@gmail.com' });
    const token = await requestResetToken('cinefila@gmail.com');

    expect((await reset(token, 'primeraClave1')).status).toBe(200);

    const session = await login('cinefila@gmail.com', 'primeraClave1');
    expect(session.user).toMatchObject({ hasPassword: true, hasGoogle: true });
    expect((await User.findOne({ where: { email: 'cinefila@gmail.com' } }))!.googleSub).toBe('google-sub-123');
  });
});
