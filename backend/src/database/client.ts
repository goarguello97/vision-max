/**
 * @fileoverview Cliente de Prisma para conexión a la base de datos
 * @module database/client
 */

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Instancia de PrismaClient con soporte para singleton en desarrollo.
 * Evita múltiples conexiones en desarrollo (hot reload).
 * @constant {PrismaClient}
 */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;