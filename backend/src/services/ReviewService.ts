/**
 * @fileoverview Servicio de reseñas (películas y series)
 * @module services/ReviewService
 */

import { reviewRepository } from '../repositories/ReviewRepository';
import { NotFoundError, ForbiddenError, ConflictError } from '../utils/AppError';
import { CreateReviewInput, UpdateReviewInput } from '../models/schemas';
import { logger } from '../utils/logger';
import { MediaType } from '@prisma/client';

export class ReviewService {
  async create(userId: number, input: CreateReviewInput) {
    logger.info('ReviewService.create', { userId, mediaId: input.mediaId, mediaType: input.mediaType });

    const existing = await reviewRepository.findByUserAndMedia(userId, input.mediaId, input.mediaType);
    if (existing) {
      throw new ConflictError('Ya has escrito una reseña para este medio');
    }

    const review = await reviewRepository.create({
      userId,
      mediaId: input.mediaId,
      mediaType: input.mediaType,
      content: input.content,
      rating: input.rating,
    });

    logger.info('Review created', { reviewId: review.id });
    return review;
  }

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

  async getByMedia(mediaId: number, mediaType: MediaType, page: number = 1, limit: number = 20) {
    logger.info('ReviewService.getByMedia', { mediaId, mediaType, page });
    return reviewRepository.findByMedia(mediaId, mediaType, page, limit);
  }

  async getByUser(userId: number, page: number = 1, limit: number = 20) {
    logger.info('ReviewService.getByUser', { userId, page });
    return reviewRepository.findByUser(userId, page, limit);
  }

  async hideReview(adminId: number, reviewId: number, isHidden: boolean) {
    logger.info('ReviewService.hideReview', { adminId, reviewId, isHidden });

    const review = await reviewRepository.findById(reviewId);
    if (!review) {
      throw new NotFoundError('Reseña no encontrada');
    }

    return reviewRepository.toggleHidden(reviewId, isHidden);
  }

  async getUserReviewForMedia(userId: number, mediaId: number, mediaType: MediaType) {
    logger.info('ReviewService.getUserReviewForMedia', { userId, mediaId, mediaType });
    return reviewRepository.findByUserAndMedia(userId, mediaId, mediaType);
  }
}

export const reviewService = new ReviewService();