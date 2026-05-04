import { userRepository } from '../repositories/UserRepository';
import { adminRepository } from '../repositories/AdminRepository';
import { reviewRepository } from '../repositories/ReviewRepository';
import { NotFoundError, ForbiddenError } from '../utils/AppError';
import { AdminAction, AdminStats } from '../models/AdminLog';
import { Role } from '@prisma/client';
import { logger } from '../utils/logger';

export class AdminService {
  async banUser(adminId: number, userId: number) {
    logger.info('AdminService.banUser', { adminId, targetUserId: userId });

    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('Usuario no encontrado');
    }

    if (user.role === Role.ADMIN) {
      throw new ForbiddenError('No puedes banear a un administrador');
    }

    await userRepository.updateBanStatus(userId, true);
    await adminRepository.createLog(adminId, 'BAN_USER', userId);

    logger.info('User banned', { userId });
  }

  async unbanUser(adminId: number, userId: number) {
    logger.info('AdminService.unbanUser', { adminId, targetUserId: userId });

    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('Usuario no encontrado');
    }

    await userRepository.updateBanStatus(userId, false);
    await adminRepository.createLog(adminId, 'UNBAN_USER', userId);

    logger.info('User unbanned', { userId });
  }

  async grantAdmin(adminId: number, userId: number) {
    logger.info('AdminService.grantAdmin', { adminId, targetUserId: userId });

    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('Usuario no encontrado');
    }

    if (user.role === Role.ADMIN) {
      throw new ForbiddenError('El usuario ya es administrador');
    }

    await userRepository.updateRole(userId, Role.ADMIN);
    await adminRepository.createLog(adminId, 'GRANT_ADMIN', userId);

    logger.info('Admin granted', { userId });
  }

  async deleteReview(adminId: number, reviewId: number) {
    logger.info('AdminService.deleteReview', { adminId, reviewId });

    const review = await reviewRepository.findById(reviewId);
    if (!review) {
      throw new NotFoundError('Reseña no encontrada');
    }

    await reviewRepository.delete(reviewId);
    await adminRepository.createLog(adminId, 'DELETE_REVIEW', review.userId);

    logger.info('Review deleted', { reviewId });
  }

  async updateReview(adminId: number, reviewId: number, isHidden: boolean) {
    logger.info('AdminService.updateReview', { adminId, reviewId, isHidden });

    const review = await reviewRepository.findById(reviewId);
    if (!review) {
      throw new NotFoundError('Reseña no encontrada');
    }

    const updated = await reviewRepository.toggleHidden(reviewId, isHidden);
    await adminRepository.createLog(
      adminId,
      isHidden ? 'HIDE_REVIEW' : 'UPDATE_REVIEW',
      review.userId
    );

    logger.info('Review updated', { reviewId, isHidden });
    return updated;
  }

  async getLogs(page: number = 1, limit: number = 50) {
    logger.info('AdminService.getLogs', { page });
    return adminRepository.getLogs(page, limit);
  }

  async getStats(): Promise<AdminStats> {
    logger.info('AdminService.getStats');
    return adminRepository.getStats();
  }
}

export const adminService = new AdminService();