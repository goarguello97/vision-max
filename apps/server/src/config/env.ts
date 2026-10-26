import { z } from 'zod';

const bool = (fallback: 'true' | 'false') =>
  z
    .enum(['true', 'false'])
    .default(fallback)
    .transform((v) => v === 'true');

const optionalString = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() !== '' ? v.trim() : undefined));

const secret = (name: string) =>
  z
    .string({ error: `${name} es obligatoria` })
    .min(32, `${name} tiene que tener al menos 32 caracteres (ver .env.example)`);

// Cada módulo suma acá sus variables al implementarse (ver .env.example y las specs).
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  APP_URL: z.url().default('http://localhost:5173'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL es obligatoria (pooler de Supabase Postgres)'),
  DATABASE_SSL: bool('true'),

  // Supabase Storage: auth solo arma avatarUrl; la subida es del módulo 03.
  SUPABASE_URL: optionalString.pipe(z.url().optional()),
  SUPABASE_AVATARS_BUCKET: z.string().default('avatars'),

  // Auth (spec 01)
  JWT_ACCESS_SECRET: secret('JWT_ACCESS_SECRET'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  ONBOARDING_JWT_SECRET: secret('ONBOARDING_JWT_SECRET'),
  COOKIE_DOMAIN: optionalString,
  COOKIE_SECURE: bool('true'),
  BCRYPT_COST: z.coerce.number().int().min(4).max(15).default(12),
  RESET_TOKEN_TTL_MIN: z.coerce.number().int().positive().default(60),
  GOOGLE_CLIENT_ID: optionalString,

  // Mail: sin SMTP_HOST los mails no se envían y el link de recuperación solo se imprime en consola.
  SMTP_HOST: optionalString,
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: optionalString,
  SMTP_PASS: optionalString,
  MAIL_FROM: z.string().default('Vision Max <no-reply@visionmax.local>'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('[env] Variables de entorno inválidas:');
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;
