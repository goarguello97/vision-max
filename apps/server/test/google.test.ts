import { AUTH_MESSAGES } from '@vision-max/shared';
import jwt from 'jsonwebtoken';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpError } from '../src/http/errors';
import { verifyGoogleCredential, type GoogleIdentity } from '../src/modules/auth/google';
import { User } from '../src/modules/auth/models';
import { api, createGoogleOnlyUser, login, refreshCookie, registerUser } from './helpers';

// Spec 01: E10 y E11 (RN-33 a RN-35). La verificación del ID token con Google se reemplaza por un mock;
// google-unit.test.ts cubre esa verificación por separado.
vi.mock('../src/modules/auth/google', () => ({ verifyGoogleCredential: vi.fn() }));

const verify = vi.mocked(verifyGoogleCredential);
const identity: GoogleIdentity = {
  sub: 'google-sub-gonza',
  email: 'gonza.97+cine@gmail.com',
  firstName: 'Gonzalo',
  lastName: 'Argüello',
};

const google = () => api().post('/api/auth/google').send({ credential: 'id-token-de-google' });
const complete = (body: object) => api().post('/api/auth/google/complete').send(body);

async function startOnboarding() {
  const res = await google();
  expect(res.body.status).toBe('needs_profile');
  return res.body.onboardingToken as string;
}

beforeEach(() => {
  verify.mockResolvedValue(identity);
});

describe('POST /api/auth/google (E10)', () => {
  it('inicia sesión si la cuenta ya tiene Google vinculado (RN-34.1)', async () => {
    await createGoogleOnlyUser({ email: identity.email, googleSub: identity.sub });

    const res = await google();

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'authenticated', user: { username: 'cinefila', hasGoogle: true } });
    expect(refreshCookie(res)).toBeDefined();
  });

  it('vincula automáticamente una cuenta existente con el mismo email (RN-34.2, A3)', async () => {
    await registerUser({ email: identity.email });

    const res = await google();

    expect(res.body).toMatchObject({ status: 'authenticated', user: { hasGoogle: true, hasPassword: true } });
    const user = await User.findOne({ where: { email: identity.email } });
    expect(user!.googleSub).toBe(identity.sub);
    expect(user!.emailVerifiedAt).toBeInstanceOf(Date);
    // Sigue pudiendo entrar con su contraseña.
    expect((await login(identity.email, 'peliculas2026')).user.username).toBe('gonza_97');
  });

  it('para un alta nueva pide completar el perfil sin crear nada en la DB (RN-34.3)', async () => {
    const res = await google();

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      status: 'needs_profile',
      onboardingToken: expect.any(String),
      prefill: {
        email: identity.email,
        firstName: 'Gonzalo',
        lastName: 'Argüello',
        suggestedUsername: 'gonza_97_cine',
      },
    });
    expect(refreshCookie(res)).toBeUndefined();
    expect(await User.count()).toBe(0);
  });

  it('si el ID sugerido está tomado propone otro libre', async () => {
    await registerUser({ username: 'gonza_97_cine', email: 'otro@mail.com' });

    const res = await google();

    expect(res.body.prefill.suggestedUsername).toMatch(/^gonza_97_cine_\d{3}$|^gonza_97_cin_\d{3}$/);
    expect(res.body.prefill.suggestedUsername).not.toBe('gonza_97_cine');
  });

  it('propaga los errores de verificación de Google', async () => {
    verify.mockRejectedValue(new HttpError(403, 'GOOGLE_EMAIL_UNVERIFIED', AUTH_MESSAGES.googleEmailUnverified));

    const res = await google();

    expect(res.status).toBe(403);
    expect(res.body.error.message).toBe(AUTH_MESSAGES.googleEmailUnverified);
  });

  it('exige el credential', async () => {
    const res = await api().post('/api/auth/google').send({});
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/google/complete (E11)', () => {
  it('crea la cuenta sin contraseña, con email verificado y sin avatar (RN-35)', async () => {
    const onboardingToken = await startOnboarding();

    const res = await complete({ onboardingToken, username: 'Gonza_G', firstName: 'Gonza', lastName: 'Argüello' });

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({
      username: 'gonza_g',
      email: identity.email,
      firstName: 'Gonza',
      avatarUrl: null,
      hasPassword: false,
      hasGoogle: true,
    });
    expect(refreshCookie(res)).toBeDefined();

    const user = await User.scope('withPassword').findOne();
    expect(user).toMatchObject({ passwordHash: null, googleSub: identity.sub });
    expect(user!.emailVerifiedAt).toBeInstanceOf(Date);
  });

  it('con el onboarding vencido responde ONBOARDING_EXPIRED (caso borde 16)', async () => {
    const expired = jwt.sign(
      { email: identity.email, firstName: 'G', lastName: 'A', iat: Math.floor(Date.now() / 1000) - 3600 },
      process.env.ONBOARDING_JWT_SECRET!,
      { subject: identity.sub, expiresIn: '15m' },
    );

    const res = await complete({ onboardingToken: expired, username: 'gonza_g', firstName: 'G', lastName: 'A' });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatchObject({ code: 'ONBOARDING_EXPIRED', message: AUTH_MESSAGES.onboardingExpired });
  });

  it('rechaza un onboarding firmado con otro secreto', async () => {
    const forged = jwt.sign({ email: 'x@mail.com', firstName: 'G', lastName: 'A' }, process.env.JWT_ACCESS_SECRET!, {
      subject: 'otro-sub',
    });
    const res = await complete({ onboardingToken: forged, username: 'gonza_g', firstName: 'G', lastName: 'A' });

    expect(res.body.error.code).toBe('ONBOARDING_EXPIRED');
  });

  it('si la cuenta se creó entretanto responde ACCOUNT_EXISTS (caso borde 17)', async () => {
    const onboardingToken = await startOnboarding();
    await registerUser({ email: identity.email });

    const res = await complete({ onboardingToken, username: 'gonza_g', firstName: 'G', lastName: 'A' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ACCOUNT_EXISTS');
  });

  it('rechaza un ID tomado o inválido', async () => {
    const onboardingToken = await startOnboarding();
    await registerUser({ username: 'cinefilo', email: 'otro@mail.com' });

    const taken = await complete({ onboardingToken, username: 'Cinefilo', firstName: 'G', lastName: 'A' });
    expect(taken.status).toBe(409);
    expect(taken.body.error.code).toBe('USERNAME_TAKEN');

    const reserved = await complete({ onboardingToken, username: 'admin', firstName: 'G', lastName: 'A' });
    expect(reserved.body.error.fields.username).toBe(AUTH_MESSAGES.usernameReserved);
  });

  it('abandonar el onboarding no deja nada en la DB (caso borde 15)', async () => {
    await startOnboarding();
    await startOnboarding();
    expect(await User.count()).toBe(0);
  });
});
