import { AUTH_MESSAGES } from '@vision-max/shared';
import { describe, expect, it } from 'vitest';
import { User } from '../src/modules/auth/models';
import { api, createGoogleOnlyUser, refreshCookie, registerUser, validUser } from './helpers';

// Spec 01: E1 (registro) y E2 (disponibilidad del ID). Gherkin "Registro con email y contraseña".

const register = (body: object) => api().post('/api/auth/register').send(body);

describe('POST /api/auth/register (E1)', () => {
  it('crea la cuenta con ID en minúsculas y deja la sesión iniciada', async () => {
    const res = await register(validUser({ username: 'Gonza_97', email: ' GONZA@Mail.com ' }));

    expect(res.status).toBe(201);
    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.user).toEqual({
      id: expect.any(String),
      username: 'gonza_97',
      email: 'gonza@mail.com',
      firstName: 'Gonzalo',
      lastName: 'Argüello',
      avatarUrl: null,
      hasPassword: true,
      hasGoogle: false,
      createdAt: expect.any(String),
    });
    expect(JSON.stringify(res.body)).not.toMatch(/password_?hash/i);
  });

  it('setea la cookie de refresh httpOnly, SameSite=Lax y acotada a /api/auth (A2)', async () => {
    const res = await register(validUser());
    const cookie = refreshCookie(res)!;

    expect(cookie.value).toMatch(/^[\w-]{43}$/);
    expect(cookie.raw).toMatch(/HttpOnly/);
    expect(cookie.raw).toMatch(/SameSite=Lax/);
    expect(cookie.raw).toMatch(/Path=\/api\/auth/);
    expect(cookie.raw).toMatch(/Max-Age=2592000/);
  });

  it('guarda la contraseña hasheada con bcrypt, sin verificar el email (RN-07, A5)', async () => {
    await registerUser();
    const user = await User.scope('withPassword').findOne({ where: { email: 'gonza@mail.com' } });

    expect(user!.passwordHash).toMatch(/^\$2[aby]\$/);
    expect(user!.passwordHash).not.toContain('peliculas2026');
    expect(user!.emailVerifiedAt).toBeNull();
    expect(user!.lastLoginAt).toBeInstanceOf(Date);
  });

  it('devuelve un error por cada campo inválido', async () => {
    const res = await register({ username: 'ab', email: 'x', firstName: '', lastName: 'A1', password: '123' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.fields).toEqual({
      username: AUTH_MESSAGES.usernameFormat,
      email: AUTH_MESSAGES.emailFormat,
      firstName: AUTH_MESSAGES.firstNameRequired,
      lastName: AUTH_MESSAGES.nameFormat,
      password: AUTH_MESSAGES.passwordPolicy,
    });
  });

  it.each([
    ['ab', AUTH_MESSAGES.usernameFormat],
    ['9lives', AUTH_MESSAGES.usernameFormat],
    ['gon.za', AUTH_MESSAGES.usernameFormat],
    ['admin', AUTH_MESSAGES.usernameReserved],
  ])('rechaza el ID "%s"', async (username, message) => {
    const res = await register(validUser({ username }));
    expect(res.status).toBe(400);
    expect(res.body.error.fields.username).toBe(message);
  });

  it.each(['abc12', 'soloLetras', '12345678'])('rechaza la contraseña "%s"', async (password) => {
    const res = await register(validUser({ password }));
    expect(res.body.error.fields.password).toBe(AUTH_MESSAGES.passwordPolicy);
  });

  it('rechaza una contraseña de más de 72 bytes aunque tenga pocos caracteres (caso borde 5)', async () => {
    const res = await register(validUser({ password: `a1${'🎬'.repeat(18)}` }));
    expect(res.body.error.fields.password).toBe(AUTH_MESSAGES.passwordPolicy);
  });

  it('rechaza una contraseña igual al email o al ID', async () => {
    const res = await register(validUser({ username: 'clave2026', password: 'Clave2026' }));
    expect(res.body.error.fields.password).toBe(AUTH_MESSAGES.passwordEqualsIdentity);
  });

  it('avisa si el email ya existe, sin distinguir mayúsculas ni espacios (RN-08)', async () => {
    await registerUser();
    const res = await register(validUser({ username: 'otro_id', email: ' GONZA@mail.com ' }));

    expect(res.status).toBe(409);
    expect(res.body.error).toMatchObject({
      code: 'EMAIL_TAKEN',
      fields: { email: AUTH_MESSAGES.emailTaken },
      meta: { googleOnly: false },
    });
  });

  it('sugiere Google si el email es de una cuenta solo-Google (RN-09)', async () => {
    await createGoogleOnlyUser({ email: 'gonza@gmail.com' });
    const res = await register(validUser({ email: 'gonza@gmail.com' }));

    expect(res.status).toBe(409);
    expect(res.body.error).toMatchObject({
      code: 'EMAIL_TAKEN',
      fields: { email: AUTH_MESSAGES.emailGoogleOnly },
      meta: { googleOnly: true },
    });
  });

  it('avisa si el ID ya existe, sin distinguir mayúsculas', async () => {
    await registerUser({ username: 'cinefilo' });
    const res = await register(validUser({ username: 'Cinefilo', email: 'otro@mail.com' }));

    expect(res.status).toBe(409);
    expect(res.body.error).toMatchObject({ code: 'USERNAME_TAKEN', fields: { username: AUTH_MESSAGES.usernameTaken } });
  });

  it('con dos envíos simultáneos crea una sola cuenta (caso borde 1)', async () => {
    const results = await Promise.all([register(validUser()), register(validUser())]);

    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(await User.count()).toBe(1);
  });
});

describe('GET /api/auth/username-available (E2)', () => {
  const check = (u: string) => api().get('/api/auth/username-available').query({ u });

  it('informa un ID libre', async () => {
    const res = await check('gonza_97');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ available: true });
  });

  it('informa un ID tomado aunque cambien las mayúsculas', async () => {
    await registerUser({ username: 'cinefilo' });
    expect((await check('Cinefilo')).body).toEqual({ available: false, reason: 'taken' });
  });

  it.each([
    ['admin', 'reserved'],
    ['9lives', 'invalid'],
    ['', 'invalid'],
  ])('rechaza "%s" con motivo %s', async (u, reason) => {
    expect((await check(u)).body).toEqual({ available: false, reason });
  });
});
