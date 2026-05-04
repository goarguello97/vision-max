/**
 * @fileoverview Modelos de datos relacionados con usuarios
 * @module models/User
 */

import { Role } from '@prisma/client';

/**
 * Tipo de rol de usuario definido en Prisma.
 * @typedef {import('@prisma/client').Role} UserRole
 */
export type UserRole = Role;

/**
 * Payload del token JWT.
 * @interface UserPayload
 */
export interface UserPayload {
  id: number;
  email: string;
  username: string;
  role: UserRole;
}

export interface AuthUser {
  id: number;
  email: string;
  username: string;
  role: UserRole;
  isBanned: boolean;
}

export interface UserResponse {
  id: number;
  email: string;
  username: string;
  role: UserRole;
  createdAt: Date;
}