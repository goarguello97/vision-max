import { Role } from '@prisma/client';

export type UserRole = Role;

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