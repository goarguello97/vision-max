import prisma from '../database/client';
import { NotFoundError } from '../utils/AppError';

interface FavoriteWithMovie {
  id: number;
  movieId: number;
  createdAt: Date;
  movie?: {
    id: number;
    title: string;
    poster_path: string | null;
    vote_average: number;
  };
}

export class FavoriteRepository {
  async findByUserAndMovie(userId: number, movieId: number) {
    return prisma.favorite.findUnique({
      where: {
        userId_movieId: {
          userId,
          movieId,
        },
      },
    });
  }

  async create(userId: number, movieId: number) {
    return prisma.favorite.create({
      data: {
        userId,
        movieId,
      },
    });
  }

  async delete(userId: number, movieId: number) {
    return prisma.favorite.delete({
      where: {
        userId_movieId: {
          userId,
          movieId,
        },
      },
    });
  }

  async findByUser(userId: number, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [favorites, total] = await Promise.all([
      prisma.favorite.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.favorite.count({ where: { userId } }),
    ]);

    return { favorites, total };
  }

  async count(): Promise<number> {
    return prisma.favorite.count();
  }

  async getUserFavoriteMovies(userId: number): Promise<number[]> {
    const favorites = await prisma.favorite.findMany({
      where: { userId },
      select: { movieId: true },
    });
    return favorites.map((f) => f.movieId);
  }
}

export const favoriteRepository = new FavoriteRepository();