/**
 * @fileoverview Servicio de reseñas de películas
 * @module services/ReviewService
 */

import { reviewRepository } from '../repositories/ReviewRepository';
import { NotFoundError, ForbiddenError, ConflictError } from '../utils/AppError';
import { CreateReviewInput, UpdateReviewInput } from '../models/schemas';
import { logger } from '../utils/logger';

/**
 * Servicio que maneja las operaciones de reseñas de películas.
 * Permite crear, actualizar, eliminar y consultar reseñas.
 * @class ReviewService
 */
export class ReviewService {
  /**
   * Crea una nueva reseña para una película.
   * @async
   * @method create
   * @param {number} userId - ID del usuario que crea la reseña
   * @param {CreateReviewInput} input - Datos de la reseña
   * @returns {Promise<any>} Reseña creada
   * @throws {ConflictError} Si el usuario ya escribió una reseña para esa película
   */
  async create(userId: number, input: CreateReviewInput) {
    logger.info('ReviewService.create', { userId, movieId: input.movieId });

    const existing = await reviewRepository.findByUserAndMovie(userId, input.movieId);
    if (existing) {
      throw new ConflictError('Ya has escrito una reseña para esta película');
    }

    const review = await reviewRepository.create({
      userId,
      movieId: input.movieId,
      content: input.content,
      rating: input.rating,
    });

    logger.info('Review created', { reviewId: review.id });
    return review;
  }

  /**
   * Actualiza una reseña existente.
   * @async
   * @method update
   * @param {number} userId - ID del usuario
   * @param {number} reviewId - ID de la reseña
   * @param {UpdateReviewInput} input - Datos actualizados
   * @returns {Promise<any>} Reseña actualizada
   * @throws {NotFoundError} Si la reseña no existe
   * @throws {ForbiddenError} Si el usuario no es el autor
   */
  async update(userId: number, reviewId: number, input: UpdateReviewInput) {
    logger.info('ReviewService.update', { userId, reviewId });

    const review = await reviewRepository.findById(reviewId);
    if (!review) {
      throw new NotFoundError('Reseña no encontrada');
    }

    if (review.userId !== userId) {
      throw new ForbiddenError('No puedes modificar esta reseña');
    }

    const updated = await reviewRepository.update(reviewId, {
      content: input.content,
      rating: input.rating,
    });

    logger.info('Review updated', { reviewId });
    return updated;
  }

  /**
   * Elimina una reseña.
   * @async
   * @method delete
   * @param {number} userId - ID del usuario que elimina
   * @param {number} reviewId - ID de la reseña
   * @param {boolean} [isAdmin=false] - Si es un administrador
   * @returns {Promise<void>}
   * @throws {NotFoundError} Si la reseña no existe
   * @throws {ForbiddenError} Si el usuario no tiene permisos
   */
  async delete(userId: number, reviewId: number, isAdmin: boolean = false) {
    logger.info('ReviewService.delete', { userId, reviewId, isAdmin });

    const review = await reviewRepository.findById(reviewId);
    if (!review) {
      throw new NotFoundError('Reseña no encontrada');
    }

    if (!isAdmin && review.userId !== userId) {
      throw new ForbiddenError('No puedes eliminar esta reseña');
    }

    await reviewRepository.delete(reviewId);
    logger.info('Review deleted', { reviewId });
  }

  /**
   * Obtiene las reseñas de una película con paginación.
   * @async
   * @method getByMovie
   * @param {number} movieId - ID de la película
   * @param {number} [page=1] - Número de página
   * @param {number} [limit=20] - Cantidad de resultados por página
   * @returns {Promise<{reviews: any[], total: number}>} Lista de reseñas y total
   */
  async getByMovie(movieId: number, page: number = 1, limit: number = 20) {
    logger.info('ReviewService.getByMovie', { movieId, page });
    return reviewRepository.findByMovie(movieId, page, limit);
  }

  /**
   * Obtiene las reseñas escritas por un usuario.
   * @async
   * @method getByUser
   * @param {number} userId - ID del usuario
   * @param {number} [page=1] - Número de página
   * @param {number} [limit=20] - Cantidad de resultados por página
   * @returns {Promise<{reviews: any[], total: number}>} Lista de reseñas y total
   */
  async getByUser(userId: number, page: number = 1, limit: number = 20) {
    logger.info('ReviewService.getByUser', { userId, page });
    return reviewRepository.findByUser(userId, page, limit);
  }

  /**
   * Oculta o muestra una reseña (acción de administrador).
   * @async
   * @method hideReview
   * @param {number} adminId - ID del administrador
   * @param {number} reviewId - ID de la reseña
   * @param {boolean} isHidden - Estado de visibilidad
   * @returns {Promise<any>} Reseña actualizada
   * @throws {NotFoundError} Si la reseña no existe
   */
  async hideReview(adminId: number, reviewId: number, isHidden: boolean) {
    logger.info('ReviewService.hideReview', { adminId, reviewId, isHidden });

    const review = await reviewRepository.findById(reviewId);
    if (!review) {
      throw new NotFoundError('Reseña no encontrada');
    }

    return reviewRepository.toggleHidden(reviewId, isHidden);
  }
}

export const reviewService = new ReviewService();