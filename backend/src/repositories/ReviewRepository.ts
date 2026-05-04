/**
 * @fileoverview Repositorio para operaciones de reseñas
 * @module repositories/ReviewRepository
 */

import prisma from '../database/client';

/**
 * Interfaz de reseña con información del usuario.
 * @interface ReviewWithUser
 */
interface ReviewWithUser {
  id: number;
  content: string;
  rating: number;
  isHidden: boolean;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: number;
    username: string;
  };
}

/**
 * Repositorio que maneja las operaciones de reseñas de películas.
 * @class ReviewRepository
 */
export class ReviewRepository {
  /**
   * Busca una reseña por su ID.
   * @async
   * @method findById
   * @param {number} id - ID de la reseña
   * @returns {Promise<Review | null>} Reseña encontrada o null
   */
  async findById(id: number) {
    return prisma.review.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });
  }

  /**
   * Busca una reseña por usuario y película.
   * @async
   * @method findByUserAndMovie
   * @param {number} userId - ID del usuario
   * @param {number} movieId - ID de la película
   * @returns {Promise<Review | null>} Reseña encontrada o null
   */
  async findByUserAndMovie(userId: number, movieId: number) {
    return prisma.review.findFirst({
      where: {
        userId,
        movieId,
      },
    });
  }

  /**
   * Crea una nueva reseña.
   * @async
   * @method create
   * @param {Object} data - Datos de la reseña
   * @returns {Promise<Review>} Reseña creada
   */
  async create(data: {
    userId: number;
    movieId: number;
    content: string;
    rating: number;
  }) {
    return prisma.review.create({
      data,
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });
  }

  /**
   * Actualiza una reseña existente.
   * @async
   * @method update
   * @param {number} id - ID de la reseña
   * @param {Object} data - Datos a actualizar
   * @returns {Promise<Review>} Reseña actualizada
   */
  async update(id: number, data: {
    content?: string;
    rating?: number;
  }) {
    return prisma.review.update({
      where: { id },
      data,
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });
  }

  /**
   * Elimina una reseña.
   * @async
   * @method delete
   * @param {number} id - ID de la reseña
   * @returns {Promise<Review>} Reseña eliminada
   */
  async delete(id: number) {
    return prisma.review.delete({
      where: { id },
    });
  }

  /**
   * Obtiene las reseñas de una película con paginación.
   * @async
   * @method findByMovie
   * @param {number} movieId - ID de la película
   * @param {number} [page=1] - Número de página
   * @param {number} [limit=20] - Cantidad por página
   * @returns {Promise<{reviews: Review[], total: number}>} Lista de reseñas y total
   */
  async findByMovie(movieId: number, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: {
          movieId,
          isHidden: false,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      }),
      prisma.review.count({
        where: {
          movieId,
          isHidden: false,
        },
      }),
    ]);

    return { reviews, total };
  }

  /**
   * Obtiene las reseñas de un usuario con paginación.
   * @async
   * @method findByUser
   * @param {number} userId - ID del usuario
   * @param {number} [page=1] - Número de página
   * @param {number} [limit=20] - Cantidad por página
   * @returns {Promise<{reviews: Review[], total: number}>} Lista de reseñas y total
   */
  async findByUser(userId: number, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      }),
      prisma.review.count({ where: { userId } }),
    ]);

    return { reviews, total };
  }

  /**
   * Alterna la visibilidad de una reseña.
   * @async
   * @method toggleHidden
   * @param {number} id - ID de la reseña
   * @param {boolean} isHidden - Estado de visibilidad
   * @returns {Promise<Review>} Reseña actualizada
   */
  async toggleHidden(id: number, isHidden: boolean) {
    return prisma.review.update({
      where: { id },
      data: { isHidden },
    });
  }

  /**
   * Cuenta el total de reseñas en el sistema.
   * @async
   * @method count
   * @returns {Promise<number>} Total de reseñas
   */
  async count(): Promise<number> {
    return prisma.review.count();
  }

  /**
   * Cuenta el total de reseñas ocultas.
   * @async
   * @method countHidden
   * @returns {Promise<number>} Total de reseñas ocultas
   */
  async countHidden(): Promise<number> {
    return prisma.review.count({ where: { isHidden: true } });
  }
}

export const reviewRepository = new ReviewRepository();