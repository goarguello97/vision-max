import { AUTH_MESSAGES } from '@vision-max/shared';
import jwt from 'jsonwebtoken';
import { describe, expect, it, vi } from 'vitest';
import { User } from '../src/modules/auth/models';
import { api, createGoogleOnlyUser, me, nowSec, refreshCookie, registerUser, signAccessToken } from './helpers';

// Spec 01: E3 (login) y E6 (/me). Gherkin "Inicio de sesión con email y contraseña".

const loginWith = (email: string, password: string) => api().post('/api/auth/login').send({ email, password });

describe('POST /api/auth/login (E3)', () => {
  it('inicia sesión con email (sin importar mayúsculas) y actualiza last_login_at', async () => {
    await registerUser();
    await User.update({ lastLoginAt: null }, { where: {} });

    const res = await loginWith(' Gonza@Mail.com', 'peliculas2026');

    expect(res.status).toBe(200);
    expect(res.body.user.username).toBe('gonza_97');
    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(refreshCookie(res)).toBeDefined();
    expect((await User.findOne())!.lastLoginAt).toBeInstanceOf(Date);
  });

  it('el access token es HS256 con sub y username y vence en 15 minutos (RN-16)', async () => {
    const { user } = await registerUser();
    const res = await loginWith('gonza@mail.com', 'peliculas2026');
    const payload = jwt.decode(res.body.accessToken, { complete: true })!;

    expect(payload.header.alg).toBe('HS256');
    expect(payload.payload).toMatchObject({ sub: user.id, username: 'gonza_97' });
    const { iat, exp } = payload.payload as { iat: number; exp: number };
    expect(exp - iat).toBe(15 * 60);
  });

  it.each([
    ['contraseña errónea', 'gonza@mail.com', 'otraClave99'],
    ['email inexistente', 'noexiste@mail.com', 'peliculas2026'],
    ['cuenta solo-Google', 'cinefila@gmail.com', 'cualquiera1'],
  ])('no revela la causa con %s (RN-13)', async (_case, email, password) => {
    await registerUser();
    await createGoogleOnlyUser();

    const res = await loginWith(email, password);

    expect(res.status).toBe(401);
    expect(res.body.error).toEqual({ code: 'INVALID_CREDENTIALS', message: AUTH_MESSAGES.invalidCredentials });
    expect(refreshCookie(res)).toBeUndefined();
  });

  it('loguea el login fallido sin el email completo ni la contraseña (§6)', async () => {
    await loginWith('gonza@mail.com', 'otraClave99');
    const logged = vi.mocked(console.warn).mock.calls.flat().join(' ');

    expect(logged).toContain('login fallido para g***@mail.com');
    expect(logged).not.toContain('gonza@mail.com');
    expect(logged).not.toContain('otraClave99');
  });

  it('valida el formato antes de buscar la cuenta', async () => {
    const res = await loginWith('no-es-email', 'x');
    expect(res.status).toBe(400);
    expect(res.body.error.fields.email).toBe(AUTH_MESSAGES.emailFormat);
  });

  it('bloquea 15 minutos después de 5 fallos, incluso con la clave correcta (RN-14)', async () => {
    await registerUser();
    for (let i = 0; i < 5; i++) {
      expect((await loginWith('gonza@mail.com', 'mala1234')).status).toBe(401);
    }

    const res = await loginWith('gonza@mail.com', 'peliculas2026');

    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('TOO_MANY_ATTEMPTS');
    expect(res.body.error.message).toBe('Demasiados intentos. Probá de nuevo en 15 minutos.');
    expect(res.body.error.meta.retryAfterSec).toBeGreaterThan(14 * 60);
    expect(res.body.error.meta.retryAfterSec).toBeLessThanOrEqual(15 * 60);
  });

  it('el límite es por email: otra cuenta desde la misma IP puede entrar', async () => {
    await registerUser();
    await registerUser({ username: 'otra_cuenta', email: 'otra@mail.com' });
    for (let i = 0; i < 5; i++) await loginWith('gonza@mail.com', 'mala1234');

    expect((await loginWith('otra@mail.com', 'peliculas2026')).status).toBe(200);
  });

  it('un login exitoso reinicia el conteo de fallos', async () => {
    await registerUser();
    for (let i = 0; i < 4; i++) await loginWith('gonza@mail.com', 'mala1234');
    expect((await loginWith('gonza@mail.com', 'peliculas2026')).status).toBe(200);

    for (let i = 0; i < 4; i++) await loginWith('gonza@mail.com', 'mala1234');
    expect((await loginWith('gonza@mail.com', 'peliculas2026')).status).toBe(200);
  });
});

describe('GET /api/auth/me (E6)', () => {
  it('devuelve el usuario de sesión con username y avatarUrl null sin avatar', async () => {
    const { accessToken } = await registerUser();
    const res = await me(accessToken);

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ username: 'gonza_97', avatarUrl: null, hasPassword: true, hasGoogle: false });
  });

  it('arma avatarUrl del bucket de Supabase con cache-buster', async () => {
    const { accessToken, user } = await registerUser();
    const updatedAt = new Date('2026-10-20T12:00:00Z');
    await User.update({ avatarKey: `${user.id}/512.webp`, avatarUpdatedAt: updatedAt }, { where: { id: user.id } });

    const res = await me(accessToken);

    expect(res.body.user.avatarUrl).toBe(
      `https://proyecto-test.supabase.co/storage/v1/object/public/avatars/${user.id}/512.webp?v=${updatedAt.getTime() / 1000}`,
    );
  });

  it('sin token responde TOKEN_INVALID', async () => {
    const res = await api().get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_INVALID');
  });

  it('con token vencido responde TOKEN_EXPIRED (dispara el refresh del cliente)', async () => {
    const { user } = await registerUser();
    const res = await me(signAccessToken(user.id, { iat: nowSec() - 1000, exp: nowSec() - 60 }));

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_EXPIRED');
  });

  it('rechaza tokens firmados con otro secreto', async () => {
    const { user } = await registerUser();
    const forged = jwt.sign({ username: 'gonza_97' }, 'otro-secreto-cualquiera-de-32-caracteres', { subject: user.id });

    expect((await me(forged)).body.error.code).toBe('TOKEN_INVALID');
  });
});
