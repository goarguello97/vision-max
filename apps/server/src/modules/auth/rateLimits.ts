import { Op, QueryTypes } from 'sequelize';
import { sequelize } from '../../db/sequelize';

// A10: ventanas fijas guardadas en la misma Postgres (tabla rate_limits, creada por migración con RLS).
// No se usa rate-limiter-flexible: prepara statements con nombre fijo y eso rompe con el
// pooler de Supabase en modo transacción (error 42P05 "prepared statement already exists").
class RateLimiter {
  constructor(
    private readonly prefix: string,
    readonly points: number,
    private readonly durationSec: number,
  ) {}

  private key = (key: string) => `${this.prefix}:${key}`.slice(0, 255);

  // Suma un punto y devuelve el estado de la ventana. Si la ventana venció, arranca una nueva.
  async consume(key: string) {
    const now = Date.now();
    const [row] = await sequelize.query<{ points: number; expire: string }>(
      `INSERT INTO rate_limits (key, points, expire) VALUES (:key, 1, :expire)
       ON CONFLICT (key) DO UPDATE SET
         points = CASE WHEN rate_limits.expire <= :now THEN 1 ELSE rate_limits.points + 1 END,
         expire = CASE WHEN rate_limits.expire <= :now THEN :expire ELSE rate_limits.expire END
       RETURNING points, expire`,
      {
        type: QueryTypes.SELECT,
        replacements: { key: this.key(key), now, expire: now + this.durationSec * 1000 },
      },
    );
    return { consumed: row?.points ?? 1, msBeforeNext: Number(row?.expire ?? now) - now };
  }

  async get(key: string) {
    const now = Date.now();
    const [row] = await sequelize.query<{ points: number; expire: string }>(
      'SELECT points, expire FROM rate_limits WHERE key = :key AND expire > :now',
      { type: QueryTypes.SELECT, replacements: { key: this.key(key), now } },
    );
    return row ? { consumed: row.points, msBeforeNext: Number(row.expire) - now } : null;
  }

  async delete(key: string) {
    await sequelize.query('DELETE FROM rate_limits WHERE key = :key', {
      replacements: { key: this.key(key) },
    });
  }
}

// RN-14: 5 fallos por email+IP cada 15 minutos.
export const loginFailures = new RateLimiter('login_fail', 5, 15 * 60);
// RN-28: 3 pedidos de reset por email y 10 por IP por hora.
export const forgotByEmail = new RateLimiter('forgot_email', 3, 60 * 60);
export const forgotByIp = new RateLimiter('forgot_ip', 10, 60 * 60);
// E2: el chequeo en vivo del ID dispara una request cada 400 ms de tipeo.
export const usernameChecks = new RateLimiter('username_check', 60, 60);

// Consume un punto; devuelve los segundos de espera si se pasó del límite.
export async function consume(rl: RateLimiter, key: string): Promise<number | null> {
  const { consumed, msBeforeNext } = await rl.consume(key);
  return consumed > rl.points ? Math.ceil(msBeforeNext / 1000) : null;
}

// Segundos de bloqueo vigentes sin consumir (antes de intentar el login).
export async function blockedFor(rl: RateLimiter, key: string): Promise<number | null> {
  const state = await rl.get(key);
  return state && state.consumed >= rl.points ? Math.ceil(state.msBeforeNext / 1000) : null;
}

// Lo llama el job diario de limpieza.
export const purgeExpiredRateLimits = () =>
  sequelize
    .getQueryInterface()
    .bulkDelete('rate_limits', { expire: { [Op.lt]: Date.now() } });
