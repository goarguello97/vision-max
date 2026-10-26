import { Router, type RequestHandler } from 'express';
import { Op, UniqueConstraintError } from 'sequelize';
import {
  AUTH_MESSAGES,
  CSRF_HEADER,
  CSRF_HEADER_VALUE,
  forgotPasswordSchema,
  googleAuthSchema,
  googleCompleteSchema,
  loginSchema,
  passwordEqualsIdentity,
  registerSchema,
  resetPasswordSchema,
  usernameSchema,
  type GoogleAuthResponse,
  type MeResponse,
  type MessageResponse,
  type ResetTokenValidation,
  type UsernameAvailability,
} from '@vision-max/shared';
import { env } from '../../config/env';
import { sequelize } from '../../db/sequelize';
import { HttpError, validate } from '../../http/errors';
import { burnPasswordCheck, hashPassword, randomToken, sha256, verifyPassword } from './crypto';
import { verifyGoogleCredential } from './google';
import { signOnboardingToken, verifyOnboardingToken } from './jwt';
import { sendPasswordResetMail } from './mail';
import { PasswordResetToken, User } from './models';
import { blockedFor, consume, forgotByEmail, forgotByIp, loginFailures, usernameChecks } from './rateLimits';
import { requireAuth } from './requireAuth';
import { endSession, revokeAllSessions, rotateSession, startSession } from './sessions';
import { findPublicUser, isUsernameTaken, suggestUsername } from './users';

export const authRouter = Router();

// "gonza@mail.com" → "g***@mail.com": para la UI de reset y para los logs de seguridad.
const maskEmail = (email: string) => {
  const [local = '', domain = ''] = email.split('@');
  return `${local.slice(0, 1)}***@${domain}`;
};

const emailTaken = (googleOnly: boolean) => {
  const message = googleOnly ? AUTH_MESSAGES.emailGoogleOnly : AUTH_MESSAGES.emailTaken;
  return new HttpError(409, 'EMAIL_TAKEN', message, { fields: { email: message }, meta: { googleOnly } });
};

const usernameTaken = () =>
  new HttpError(409, 'USERNAME_TAKEN', AUTH_MESSAGES.usernameTaken, {
    fields: { username: AUTH_MESSAGES.usernameTaken },
  });

const tooManyAttempts = (retryAfterSec: number) =>
  new HttpError(
    429,
    'TOO_MANY_ATTEMPTS',
    `Demasiados intentos. Probá de nuevo en ${Math.ceil(retryAfterSec / 60)} minutos.`,
    { meta: { retryAfterSec } },
  );

const resetInvalid = () =>
  new HttpError(410, 'RESET_TOKEN_INVALID', 'Este link ya no es válido. Pedí uno nuevo.');

// RN-21: mitigación CSRF adicional a SameSite para los endpoints que usan la cookie.
const requireCsrfHeader: RequestHandler = (req, _res, next) => {
  if (req.get(CSRF_HEADER) !== CSRF_HEADER_VALUE) {
    throw new HttpError(403, 'CSRF_CHECK_FAILED', 'Solicitud no permitida.');
  }
  next();
};

// E1
authRouter.post('/register', async (req, res) => {
  const input = validate(registerSchema, req.body);

  const existing = await User.scope('withPassword').findOne({ where: { email: input.email } });
  if (existing) throw emailTaken(existing.passwordHash == null);
  if (await isUsernameTaken(input.username)) throw usernameTaken();

  let user: User;
  try {
    user = await User.create({
      username: input.username,
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      passwordHash: await hashPassword(input.password),
      googleSub: null,
      emailVerifiedAt: null,
      passwordChangedAt: null,
      lastLoginAt: new Date(),
    });
  } catch (err) {
    // Carrera (caso borde 2): otro registro tomó el email o el ID entre el chequeo y el insert.
    if (err instanceof UniqueConstraintError) {
      throw 'email' in (err.fields ?? {}) ? emailTaken(false) : usernameTaken();
    }
    throw err;
  }

  res.status(201).json(await startSession(req, res, user, true));
});

// E2
authRouter.get('/username-available', async (req, res) => {
  const wait = await consume(usernameChecks, req.ip ?? 'unknown');
  if (wait) {
    throw new HttpError(429, 'TOO_MANY_REQUESTS', 'Demasiadas consultas. Esperá un momento.', {
      meta: { retryAfterSec: wait },
    });
  }

  const parsed = usernameSchema.safeParse(String(req.query.u ?? ''));
  let body: UsernameAvailability;
  if (!parsed.success) {
    const reserved = parsed.error.issues.some((i) => i.message === AUTH_MESSAGES.usernameReserved);
    body = { available: false, reason: reserved ? 'reserved' : 'invalid' };
  } else {
    body = (await isUsernameTaken(parsed.data)) ? { available: false, reason: 'taken' } : { available: true };
  }
  res.json(body);
});

// E3
authRouter.post('/login', async (req, res) => {
  const input = validate(loginSchema, req.body);
  const limitKey = `${input.email}|${req.ip}`;

  const blocked = await blockedFor(loginFailures, limitKey);
  if (blocked) throw tooManyAttempts(blocked);

  // RN-13: mismo error y mismo costo para email inexistente, clave errónea o cuenta solo-Google.
  const user = await User.scope('withPassword').findOne({ where: { email: input.email } });
  const valid = user?.passwordHash
    ? await verifyPassword(input.password, user.passwordHash)
    : await burnPasswordCheck(input.password);

  if (!user || !valid) {
    console.warn(`[auth] login fallido para ${maskEmail(input.email)} desde ${req.ip}`);
    const wait = await consume(loginFailures, limitKey);
    if (wait) throw tooManyAttempts(wait);
    throw new HttpError(401, 'INVALID_CREDENTIALS', AUTH_MESSAGES.invalidCredentials);
  }

  await loginFailures.delete(limitKey);
  await user.update({ lastLoginAt: new Date() });
  res.json(await startSession(req, res, user));
});

// E4
authRouter.post('/refresh', requireCsrfHeader, async (req, res) => {
  res.json(await rotateSession(req, res));
});

// E5
authRouter.post('/logout', requireCsrfHeader, async (req, res) => {
  await endSession(req, res);
  res.status(204).end();
});

// E6
authRouter.get('/me', requireAuth, async (req, res) => {
  const user = await findPublicUser(req.user!.id);
  if (!user) throw new HttpError(401, 'TOKEN_INVALID', 'Tenés que iniciar sesión.');
  const body: MeResponse = { user };
  res.json(body);
});

// E7: responde siempre igual y procesa en segundo plano, así el tiempo no revela si la cuenta existe.
authRouter.post('/forgot-password', (req, res) => {
  const { email } = validate(forgotPasswordSchema, req.body);
  const body: MessageResponse = { message: AUTH_MESSAGES.forgotPasswordSent };
  res.status(202).json(body);

  requestPasswordReset(email, req.ip ?? null).catch((err: unknown) => {
    console.error('[auth] no se pudo procesar el pedido de recupero:', err);
  });
});

async function requestPasswordReset(email: string, ip: string | null) {
  // RN-28: superado el límite se mantiene la respuesta genérica, pero no sale el mail.
  if ((await consume(forgotByIp, ip ?? 'unknown')) || (await consume(forgotByEmail, email))) {
    console.warn(`[auth] límite de recupero alcanzado para ${maskEmail(email)} desde ${ip}`);
    return;
  }

  const user = await User.findOne({ where: { email } });
  if (!user) return;

  const raw = randomToken();
  const now = new Date();
  await sequelize.transaction(async (transaction) => {
    // RN-27: pedir un link nuevo invalida los anteriores pendientes.
    await PasswordResetToken.update(
      { invalidatedAt: now },
      { where: { userId: user.id, usedAt: null, invalidatedAt: null }, transaction },
    );
    await PasswordResetToken.create(
      {
        userId: user.id,
        tokenHash: sha256(raw),
        expiresAt: new Date(now.getTime() + env.RESET_TOKEN_TTL_MIN * 60_000),
        requestedIp: ip,
      },
      { transaction },
    );
  });
  console.info(`[auth] recupero solicitado para el usuario ${user.id}`);

  await sendPasswordResetMail({
    to: user.email,
    firstName: user.firstName,
    username: user.username,
    link: `${env.APP_URL}/restablecer-contrasena?token=${encodeURIComponent(raw)}`,
    ttlMin: env.RESET_TOKEN_TTL_MIN,
  });
}

const findUsableResetToken = (token: string) =>
  token === ''
    ? Promise.resolve(null)
    : PasswordResetToken.findOne({
        where: {
          tokenHash: sha256(token),
          usedAt: null,
          invalidatedAt: null,
          expiresAt: { [Op.gt]: new Date() },
        },
      });

// E8
authRouter.get('/reset-password/validate', async (req, res) => {
  const row = await findUsableResetToken(String(req.query.token ?? ''));
  const user = row ? await User.findByPk(row.userId) : null;
  if (!user) throw resetInvalid();
  const body: ResetTokenValidation = { valid: true, email: maskEmail(user.email) };
  res.json(body);
});

// E9
authRouter.post('/reset-password', async (req, res) => {
  const { token, password } = validate(resetPasswordSchema, req.body);
  const row = await findUsableResetToken(token);
  const user = row ? await User.scope('withPassword').findByPk(row.userId) : null;
  if (!row || !user) throw resetInvalid();

  if (passwordEqualsIdentity(password, user.email, user.username)) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'Revisá los campos marcados.', {
      fields: { password: AUTH_MESSAGES.passwordEqualsIdentity },
    });
  }
  if (user.passwordHash && (await verifyPassword(password, user.passwordHash))) {
    throw new HttpError(400, 'SAME_PASSWORD', AUTH_MESSAGES.samePassword, {
      fields: { password: AUTH_MESSAGES.samePassword },
    });
  }

  const passwordHash = await hashPassword(password);
  await sequelize.transaction(async (transaction) => {
    const [used] = await PasswordResetToken.update(
      { usedAt: new Date() },
      { where: { id: row.id, usedAt: null }, transaction },
    );
    if (used === 0) throw resetInvalid();
    // RN-31: el cambio invalida los access tokens viejos (requireAuth) y cierra todas las sesiones.
    await user.update({ passwordHash, passwordChangedAt: new Date() }, { transaction });
    await revokeAllSessions(user.id, transaction);
  });
  console.info(`[auth] contraseña restablecida para el usuario ${user.id}`);

  const body: MessageResponse = { message: AUTH_MESSAGES.passwordUpdated };
  res.json(body);
});

// E10
authRouter.post('/google', async (req, res) => {
  const { credential } = validate(googleAuthSchema, req.body);
  const identity = await verifyGoogleCredential(credential);

  // RN-34: 1) ya vinculado, 2) mismo email verificado → se vincula, 3) alta nueva.
  let user = await User.scope('withPassword').findOne({ where: { googleSub: identity.sub } });
  if (!user) {
    user = await User.scope('withPassword').findOne({ where: { email: identity.email } });
    if (user) {
      user.googleSub = identity.sub;
      user.emailVerifiedAt ??= new Date();
    }
  }

  if (user) {
    user.lastLoginAt = new Date();
    await user.save();
    const body: GoogleAuthResponse = { status: 'authenticated', ...(await startSession(req, res, user)) };
    res.json(body);
    return;
  }

  const body: GoogleAuthResponse = {
    status: 'needs_profile',
    onboardingToken: signOnboardingToken(identity),
    prefill: {
      email: identity.email,
      firstName: identity.firstName,
      lastName: identity.lastName,
      suggestedUsername: await suggestUsername(identity.email),
    },
  };
  res.json(body);
});

// E11
authRouter.post('/google/complete', async (req, res) => {
  const input = validate(googleCompleteSchema, req.body);
  const onboarding = verifyOnboardingToken(input.onboardingToken);
  if (!onboarding) throw new HttpError(401, 'ONBOARDING_EXPIRED', AUTH_MESSAGES.onboardingExpired);

  const accountExists = () =>
    new HttpError(409, 'ACCOUNT_EXISTS', 'Ya existe una cuenta con este email. Volvé a continuar con Google.');

  const existing = await User.count({
    where: { [Op.or]: [{ email: onboarding.email }, { googleSub: onboarding.sub }] },
  });
  if (existing > 0) throw accountExists();
  if (await isUsernameTaken(input.username)) throw usernameTaken();

  let user: User;
  try {
    // RN-35: cuenta sin contraseña, email verificado por Google y sin avatar (iniciales en la UI).
    user = await User.create({
      username: input.username,
      email: onboarding.email,
      firstName: input.firstName,
      lastName: input.lastName,
      passwordHash: null,
      googleSub: onboarding.sub,
      emailVerifiedAt: new Date(),
      passwordChangedAt: null,
      lastLoginAt: new Date(),
    });
  } catch (err) {
    if (err instanceof UniqueConstraintError) {
      throw 'username' in (err.fields ?? {}) ? usernameTaken() : accountExists();
    }
    throw err;
  }

  res.status(201).json(await startSession(req, res, user, false));
});
