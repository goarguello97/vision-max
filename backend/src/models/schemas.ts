import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Email inválido').max(255, 'Email demasiado largo'),
  password: z.string().min(6, 'Password mínimo 6 caracteres').max(100, 'Password demasiado largo'),
  username: z.string().min(3, 'Username mínimo 3 caracteres').max(50, 'Username demasiado largo'),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Password requerido'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const createReviewSchema = z.object({
  movieId: z.number().int().positive('ID de película inválido'),
  content: z.string().min(1, 'Contenido requerido').max(2000, 'Contenido demasiado largo'),
  rating: z.number().int().min(1, 'Rating mínimo 1').max(5, 'Rating máximo 5'),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;

export const updateReviewSchema = z.object({
  content: z.string().min(1, 'Contenido requerido').max(2000, 'Contenido demasiado largo').optional(),
  rating: z.number().int().min(1, 'Rating mínimo 1').max(5, 'Rating máximo 5').optional(),
});

export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationParams = z.infer<typeof paginationSchema>;