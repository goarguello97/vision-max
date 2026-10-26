import { z } from 'zod';

export const MEDIA_TYPES = ['movie', 'tv'] as const;
export const mediaTypeSchema = z.enum(MEDIA_TYPES);
export type MediaType = z.infer<typeof mediaTypeSchema>;

export const YEAR_MIN = 1900;
