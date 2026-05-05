/**
 * @fileoverview Esquemas de validación Zod para entrada de usuarios
 * @module models/schemas
 */

import { z } from 'zod';

/**
 * Esquema de validación para registro de usuario.
 * @constant {z.ZodObject}
 */
export const registerSchema = z.object({
  email: z.string().email('Email inválido').max(255, 'Email demasiado largo'),
  password: z.string().min(6, 'Password mínimo 6 caracteres').max(100, 'Password demasiado largo'),
  username: z.string().min(3, 'Username mínimo 3 caracteres').max(50, 'Username demasiado largo'),
});

/** Tipo inferido del esquema de registro */
export type RegisterInput = z.infer<typeof registerSchema>;

/**
 * Esquema de validación para login de usuario.
 * @constant {z.ZodObject}
 */
export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Password requerido'),
});

/** Tipo inferido del esquema de login */
export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Esquema de validación para creación de reseña.
 * @constant {z.ZodObject}
 */
export const createReviewSchema = z.object({
  mediaId: z.number().int().positive('ID de medio inválido'),
  mediaType: z.enum(['MOVIE', 'TV']),
  content: z.string().min(1, 'Contenido requerido').max(2000, 'Contenido demasiado largo'),
  rating: z.number().int().min(1, 'Rating mínimo 1').max(5, 'Rating máximo 5'),
});

/** Tipo inferido del esquema de creación de reseña */
export type CreateReviewInput = z.infer<typeof createReviewSchema>;

/**
 * Esquema de validación para creación de reseña de TV.
 * @constant {z.ZodObject}
 */
export const createTvReviewSchema = z.object({
  mediaId: z.number().int().positive('ID de serie inválido'),
  mediaType: z.literal('TV'),
  content: z.string().min(1, 'Contenido requerido').max(2000, 'Contenido demasiado largo'),
  rating: z.number().int().min(1, 'Rating mínimo 1').max(5, 'Rating máximo 5'),
});

/**
 * Esquema de validación para actualización de reseña.
 * @constant {z.ZodObject}
 */
export const updateReviewSchema = z.object({
  content: z.string().min(1, 'Contenido requerido').max(2000, 'Contenido demasiado largo').optional(),
  rating: z.number().int().min(1, 'Rating mínimo 1').max(5, 'Rating máximo 5').optional(),
});

/** Tipo inferido del esquema de actualización de reseña */
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;

/**
 * Esquema de validación para paginación.
 * @constant {z.ZodObject}
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/** Tipo inferido del esquema de paginación */
export type PaginationParams = z.infer<typeof paginationSchema>;