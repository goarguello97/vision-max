/**
 * @fileoverview Servicio de administración del sistema
 * @module services/AdminService
 */

import { userRepository } from '../repositories/UserRepository';
import { adminRepository } from '../repositories/AdminRepository';
import { reviewRepository } from '../repositories/ReviewRepository';
import { NotFoundError, ForbiddenError } from '../utils/AppError';
import { AdminAction, AdminStats } from '../models/AdminLog';
import { Role } from '@prisma/client';
import { logger } from '../utils/logger';

/**
 * Servicio que maneja las operaciones de administración del sistema.
 * Proporciona métodos para banear usuarios, gestionar reseñas y obtener estadísticas.
 * @class AdminService
 */
export class AdminService {
  /**
   * Banea a un usuario del sistema.
   * @async
   * @method banUser
   * @param {number} adminId - ID del administrador que realiza la acción
   * @param {number} userId - ID del usuario a banear
   * @returns {Promise<void>}
   * @throws {NotFoundError} Si el usuario no existe
   * @throws {ForbiddenError} Si se intenta banear a un administrador
   */
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

  /**
   * Desbanea a un usuario del sistema.
   * @async
   * @method unbanUser
   * @param {number} adminId - ID del administrador que realiza la acción
   * @param {number} userId - ID del usuario a desbanear
   * @returns {Promise<void>}
   * @throws {NotFoundError} Si el usuario no existe
   */
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

  /**
   * Concede permisos de administrador a un usuario.
   * @async
   * @method grantAdmin
   * @param {number} adminId - ID del administrador que realiza la acción
   * @param {number} userId - ID del usuario a promover
   * @returns {Promise<void>}
   * @throws {NotFoundError} Si el usuario no existe
   * @throws {ForbiddenError} Si el usuario ya es administrador
   */
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

  /**
   * Elimina una reseña (acción de administrador).
   * @async
   * @method deleteReview
   * @param {number} adminId - ID del administrador
   * @param {number} reviewId - ID de la reseña
   * @returns {Promise<void>}
   * @throws {NotFoundError} Si la reseña no existe
   */
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

  /**
   * Oculta o muestra una reseña.
   * @async
   * @method updateReview
   * @param {number} adminId - ID del administrador
   * @param {number} reviewId - ID de la reseña
   * @param {boolean} isHidden - Estado de visibilidad
   * @returns {Promise<any>} Reseña actualizada
   * @throws {NotFoundError} Si la reseña no existe
   */
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

  /**
   * Obtiene los logs de administración con paginación.
   * @async
   * @method getLogs
   * @param {number} [page=1] - Número de página
   * @param {number} [limit=50] - Cantidad de resultados por página
   * @returns {Promise<{logs: AdminAction[], total: number}>} Lista de logs y total
   */
  async getLogs(page: number = 1, limit: number = 50) {
    logger.info('AdminService.getLogs', { page });
    return adminRepository.getLogs(page, limit);
  }

  /**
   * Obtiene estadísticas del sistema.
   * @async
   * @method getStats
   * @returns {Promise<AdminStats>} Estadísticas del sistema
   */
  async getStats(): Promise<AdminStats> {
    logger.info('AdminService.getStats');
    return adminRepository.getStats();
  }
}

export const adminService = new AdminService();