import { reviewRepository } from '../repositories/ReviewRepository';
import { NotFoundError, ForbiddenError, ConflictError } from '../utils/AppError';
import { CreateReviewInput, UpdateReviewInput } from '../models/schemas';
import { logger } from '../utils/logger';

export class ReviewService {
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

  async getByMovie(movieId: number, page: number = 1, limit: number = 20) {
    logger.info('ReviewService.getByMovie', { movieId, page });
    return reviewRepository.findByMovie(movieId, page, limit);
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
}

export const reviewService = new ReviewService();