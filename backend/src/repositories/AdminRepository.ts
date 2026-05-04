import prisma from '../database/client';
import { Role } from '@prisma/client';
import { AdminAction } from '../models/AdminLog';

export class AdminRepository {
  async createLog(adminId: number, action: AdminAction, targetUserId?: number) {
    return prisma.adminLog.create({
      data: {
        adminId,
        action,
        targetUserId: targetUserId || null,
      },
    });
  }

  async getLogs(page: number = 1, limit: number = 50) {
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.adminLog.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          admin: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      }),
      prisma.adminLog.count(),
    ]);

    return { logs, total };
  }

  async getStats() {
    const [
      totalUsers,
      totalAdmins,
      bannedUsers,
      totalReviews,
      hiddenReviews,
      totalFavorites,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: Role.ADMIN } }),
      prisma.user.count({ where: { isBanned: true } }),
      prisma.review.count(),
      prisma.review.count({ where: { isHidden: true } }),
      prisma.favorite.count(),
    ]);

    return {
      totalUsers,
      totalAdmins,
      bannedUsers,
      totalReviews,
      hiddenReviews,
      totalFavorites,
    };
  }
}

export const adminRepository = new AdminRepository();