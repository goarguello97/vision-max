import { afterAll, beforeEach, vi } from 'vitest';
import { sequelize } from '../src/db/sequelize';

// Ningún test manda mails: el envío se reemplaza por un mock que guarda el link.
vi.mock('../src/modules/auth/mail', () => ({ sendPasswordResetMail: vi.fn() }));

// Los eventos de seguridad se loguean con console.warn/info: se silencian, pero los tests pueden leerlos.
vi.spyOn(console, 'warn').mockImplementation(() => undefined);
vi.spyOn(console, 'info').mockImplementation(() => undefined);

beforeEach(async () => {
  vi.clearAllMocks();
  await sequelize.query(
    'TRUNCATE users, refresh_tokens, password_reset_tokens, rate_limits RESTART IDENTITY CASCADE',
  );
});

afterAll(async () => {
  await sequelize.close();
});
