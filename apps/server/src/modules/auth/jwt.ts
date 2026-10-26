import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../../config/env';

// RN-16: access token HS256 de vida corta, payload { sub, username }.
export interface AccessPayload {
  sub: string;
  username: string;
  iat: number;
}

export const signAccessToken = (user: { id: string; username: string }) =>
  jwt.sign({ username: user.username }, env.JWT_ACCESS_SECRET, {
    algorithm: 'HS256',
    subject: user.id,
    expiresIn: env.JWT_ACCESS_TTL as SignOptions['expiresIn'],
  });

// Tira TokenExpiredError o JsonWebTokenError; requireAuth los traduce a códigos de la API.
export const verifyAccessToken = (token: string) =>
  jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: ['HS256'] }) as AccessPayload;

// RN-34.3: estado intermedio del alta con Google. No hay usuario en la DB hasta completar el perfil.
export interface OnboardingPayload {
  sub: string; // google_sub
  email: string;
  firstName: string;
  lastName: string;
}

export const signOnboardingToken = ({ sub, ...rest }: OnboardingPayload) =>
  jwt.sign(rest, env.ONBOARDING_JWT_SECRET, { algorithm: 'HS256', subject: sub, expiresIn: '15m' });

export const verifyOnboardingToken = (token: string): OnboardingPayload | null => {
  try {
    return jwt.verify(token, env.ONBOARDING_JWT_SECRET, { algorithms: ['HS256'] }) as OnboardingPayload;
  } catch {
    return null;
  }
};
