import { Op } from 'sequelize';
import { PasswordResetToken } from './models';
import { purgeExpiredRateLimits } from './rateLimits';
import { purgeExpiredRefreshTokens } from './sessions';

const DAY_MS = 86_400_000;

async function runCleanup() {
  try {
    const refresh = await purgeExpiredRefreshTokens();
    const resets = await PasswordResetToken.destroy({
      where: { expiresAt: { [Op.lt]: new Date(Date.now() - 7 * DAY_MS) } },
    });
    await purgeExpiredRateLimits();
    if (refresh + resets > 0) {
      console.info(`[auth] limpieza: ${refresh} refresh tokens y ${resets} tokens de reset borrados`);
    }
  } catch (err) {
    console.error('[auth] falló la limpieza de tokens:', err);
  }
}

// Job diario de la sección 2.2. Corre una vez al minuto de arrancar y después cada 24 h.
export function startAuthCleanupJob() {
  setTimeout(runCleanup, 60_000).unref();
  setInterval(runCleanup, DAY_MS).unref();
}
