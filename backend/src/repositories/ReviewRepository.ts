import prisma from '../database/client';
import { NotFoundError } from '../utils/AppError';

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

export class ReviewRepository {
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

  async findByUserAndMovie(userId: number, movieId: number) {
    return prisma.review.findFirst({
      where: {
        userId,
        movieId,
      },
    });
  }

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

  async delete(id: number) {
    return prisma.review.delete({
      where: { id },
    });
  }

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

  async toggleHidden(id: number, isHidden: boolean) {
    return prisma.review.update({
      where: { id },
      data: { isHidden },
    });
  }

  async count(): Promise<number> {
    return prisma.review.count();
  }

  async countHidden(): Promise<number> {
    return prisma.review.count({ where: { isHidden: true } });
  }
}

export const reviewRepository = new ReviewRepository();