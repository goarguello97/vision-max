import jwt from 'jsonwebtoken';
import config from '../config';
import { UserPayload } from '../models/User';

export const generateToken = (user: UserPayload): string => {
  return jwt.sign(user, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  } as jwt.SignOptions);
};

export const verifyToken = (token: string): UserPayload => {
  return jwt.verify(token, config.jwt.secret) as UserPayload;
};

export const tokenCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};