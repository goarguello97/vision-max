import { Sequelize } from 'sequelize';
import { env } from '../config/env';

// DATABASE_URL apunta al pooler de Supabase. Sin sync(): el esquema lo manejan las migraciones.
export const sequelize = new Sequelize(env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: env.DATABASE_SSL ? { ssl: { require: true, rejectUnauthorized: false } } : {},
  define: { underscored: true, timestamps: true },
  pool: { max: 5, idle: 10_000 },
});
