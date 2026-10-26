import { randomUUID } from 'node:crypto';
import type { CookieOptions, Request, Response } from 'express';
import { Op, type Transaction } from 'sequelize';
import type { AuthResponse } from '@vision-max/shared';
import { env } from '../../config/env';
import { sequelize } from '../../db/sequelize';
import { HttpError } from '../../http/errors';
import { randomToken, sha256 } from './crypto';
import { signAccessToken } from './jwt';
import { RefreshToken, type User } from './models';
import { findPublicUser, toPublicUser } from './users';

export const REFRESH_COOKIE = 'rt';
const DAY_MS = 86_400_000;
const REUSE_GRACE_MS = 10_000; // RN-19: tolera la carrera entre pestañas.

const cookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: 'lax',
  path: '/api/auth',
  domain: env.COOKIE_DOMAIN,
});

const setRefreshCookie = (res: Response, token: string) =>
  res.cookie(REFRESH_COOKIE, token, { ...cookieOptions(), maxAge: env.REFRESH_TOKEN_TTL_DAYS * DAY_MS });

export const clearRefreshCookie = (res: Response) => res.clearCookie(REFRESH_COOKIE, cookieOptions());

const clientInfo = (req: Request) => ({
  userAgent: req.get('user-agent')?.slice(0, 255) ?? null,
  ip: req.ip ?? null,
});

async function createRefreshToken(userId: string, familyId: string, req: Request) {
  const raw = randomToken();
  const row = await RefreshToken.create({
    userId,
    familyId,
    tokenHash: sha256(raw),
    expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * DAY_MS),
    ...clientInfo(req),
  });
  return { raw, row };
}

// Login, registro o Google: abre una familia nueva, setea la cookie y arma la respuesta.
export async function startSession(req: Request, res: Response, user: User, hasPassword?: boolean) {
  const { raw } = await createRefreshToken(user.id, randomUUID(), req);
  setRefreshCookie(res, raw);
  const body: AuthResponse = { user: toPublicUser(user, hasPassword), accessToken: signAccessToken(user) };
  return body;
}

const revokeFamily = (familyId: string) =>
  RefreshToken.update({ revokedAt: new Date() }, { where: { familyId, revokedAt: null } });

export const revokeAllSessions = (userId: string, transaction?: Transaction) =>
  RefreshToken.update({ revokedAt: new Date() }, { where: { userId, revokedAt: null }, transaction });

function fail(res: Response, code: 'NO_SESSION' | 'SESSION_EXPIRED' | 'SESSION_REVOKED'): never {
  clearRefreshCookie(res);
  const messages = {
    NO_SESSION: 'No hay una sesión activa.',
    SESSION_EXPIRED: 'Tu sesión venció. Iniciá sesión de nuevo.',
    SESSION_REVOKED: 'Tu sesión se cerró por seguridad. Iniciá sesión de nuevo.',
  };
  throw new HttpError(401, code, messages[code]);
}

// E4: rota el refresh (RN-18) y detecta reuso (RN-19).
export async function rotateSession(req: Request, res: Response): Promise<AuthResponse> {
  const raw: unknown = req.cookies?.[REFRESH_COOKIE];
  if (typeof raw !== 'string' || raw === '') fail(res, 'NO_SESSION');

  const current = await RefreshToken.findOne({ where: { tokenHash: sha256(raw) } });
  if (!current) fail(res, 'NO_SESSION');
  if (current.revokedAt) fail(res, 'SESSION_REVOKED');
  if (current.expiresAt.getTime() <= Date.now()) fail(res, 'SESSION_EXPIRED');

  const next = await sequelize.transaction(async (transaction) => {
    // Update condicional: si dos requests llegan juntas, solo una "gana" la rotación.
    const [claimed] = await RefreshToken.update(
      { rotatedAt: new Date() },
      { where: { id: current.id, rotatedAt: null }, transaction },
    );
    if (claimed === 0) {
      const rotated = await RefreshToken.findByPk(current.id, { transaction });
      const rotatedAt = rotated?.rotatedAt?.getTime() ?? 0;
      if (Date.now() - rotatedAt > REUSE_GRACE_MS) return null;
    }

    const nextRaw = randomToken();
    const row = await RefreshToken.create(
      {
        userId: current.userId,
        familyId: current.familyId,
        tokenHash: sha256(nextRaw),
        expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * DAY_MS),
        ...clientInfo(req),
      },
      { transaction },
    );
    if (claimed === 1) {
      await RefreshToken.update({ replacedById: row.id }, { where: { id: current.id }, transaction });
    }
    return nextRaw;
  });

  if (next === null) {
    await revokeFamily(current.familyId);
    console.warn(`[auth] reuso de refresh token: familia ${current.familyId} revocada (ip ${req.ip})`);
    fail(res, 'SESSION_REVOKED');
  }

  const user = await findPublicUser(current.userId);
  if (!user) fail(res, 'NO_SESSION');

  setRefreshCookie(res, next);
  return { user, accessToken: signAccessToken(user) };
}

// E5: revoca solo la familia de esta sesión (RN-23). Idempotente.
export async function endSession(req: Request, res: Response) {
  const raw: unknown = req.cookies?.[REFRESH_COOKIE];
  if (typeof raw === 'string' && raw !== '') {
    const current = await RefreshToken.findOne({ where: { tokenHash: sha256(raw) } });
    if (current) await revokeFamily(current.familyId);
  }
  clearRefreshCookie(res);
}

// Job diario (sección 2.2): borra refresh tokens vencidos hace más de 7 días.
export const purgeExpiredRefreshTokens = () =>
  RefreshToken.destroy({ where: { expiresAt: { [Op.lt]: new Date(Date.now() - 7 * DAY_MS) } } });
