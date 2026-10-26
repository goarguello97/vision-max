import jwt from 'jsonwebtoken';
import request from 'supertest';
import { expect } from 'vitest';
import type { AuthResponse } from '@vision-max/shared';
import { createApp } from '../src/app';
import { User } from '../src/modules/auth/models';

export const app = createApp();
export const api = () => request(app);

export const CSRF = { 'X-Requested-With': 'tmdb-web' };

export const validUser = (overrides: Partial<Record<'username' | 'email' | 'firstName' | 'lastName' | 'password', string>> = {}) => ({
  username: 'gonza_97',
  email: 'gonza@mail.com',
  firstName: 'Gonzalo',
  lastName: 'Argüello',
  password: 'peliculas2026',
  ...overrides,
});

// Valor y atributos de la cookie `rt` de una respuesta (undefined si no la setea).
export function refreshCookie(res: { headers: Record<string, unknown> }) {
  const cookies = (res.headers['set-cookie'] as string[] | undefined) ?? [];
  const raw = cookies.find((c) => c.startsWith('rt='));
  if (!raw) return undefined;
  return { value: decodeURIComponent(raw.slice(3, raw.indexOf(';'))), raw };
}

export async function registerUser(overrides: Parameters<typeof validUser>[0] = {}) {
  const res = await api().post('/api/auth/register').send(validUser(overrides));
  expect(res.status).toBe(201);
  const body = res.body as AuthResponse;
  return { ...body, rt: refreshCookie(res)!.value };
}

export async function login(email = 'gonza@mail.com', password = 'peliculas2026') {
  const res = await api().post('/api/auth/login').send({ email, password });
  expect(res.status).toBe(200);
  return { ...(res.body as AuthResponse), rt: refreshCookie(res)!.value };
}

export const refresh = (rt?: string) => {
  const req = api().post('/api/auth/refresh').set(CSRF);
  return rt ? req.set('Cookie', `rt=${rt}`) : req;
};

export const me = (accessToken: string) => api().get('/api/auth/me').set('Authorization', `Bearer ${accessToken}`);

// Cuenta solo-Google creada directo en la DB (sin pasar por el flujo de onboarding).
export const createGoogleOnlyUser = (overrides: Partial<{ username: string; email: string; googleSub: string }> = {}) =>
  User.create({
    username: overrides.username ?? 'cinefila',
    email: overrides.email ?? 'cinefila@gmail.com',
    firstName: 'Lucía',
    lastName: 'Ferreyra',
    passwordHash: null,
    googleSub: overrides.googleSub ?? 'google-sub-123',
    emailVerifiedAt: new Date(),
    passwordChangedAt: null,
    lastLoginAt: null,
  });

// Access token firmado a mano para probar vencimiento y emisión anterior a un cambio de contraseña.
export function signAccessToken(sub: string, claims: { iat?: number; exp?: number } = {}) {
  return jwt.sign({ username: 'x', ...claims }, process.env.JWT_ACCESS_SECRET!, { algorithm: 'HS256', subject: sub });
}

export const nowSec = () => Math.floor(Date.now() / 1000);
