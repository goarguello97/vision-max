import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { HttpError } from '../../http/errors';
import { verifyAccessToken } from './jwt';
import { User } from './models';

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; username: string };
    }
  }
}

// Bearer obligatorio. Rechaza tokens emitidos antes del último cambio de contraseña (caso borde 9).
export const requireAuth: RequestHandler = async (req, _res, next) => {
  const header = req.get('authorization') ?? '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    throw new HttpError(401, 'TOKEN_INVALID', 'Tenés que iniciar sesión.');
  }

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new HttpError(401, 'TOKEN_EXPIRED', 'Tu sesión venció.');
    }
    throw new HttpError(401, 'TOKEN_INVALID', 'Tenés que iniciar sesión.');
  }

  const user = await User.findByPk(payload.sub, { attributes: ['id', 'username', 'passwordChangedAt'] });
  const changedAtSec = user?.passwordChangedAt ? Math.floor(user.passwordChangedAt.getTime() / 1000) : 0;
  if (!user || payload.iat < changedAtSec) {
    throw new HttpError(401, 'TOKEN_INVALID', 'Tenés que iniciar sesión.');
  }

  req.user = { id: user.id, username: user.username };
  next();
};
