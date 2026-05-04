import config from '../config';
import { getMockMovies, searchMockMovies, getMockMovieDetail, getMockCredits } from '../utils/mockTMDB';
import { tmdbClient } from '../utils/tmdbClient';
import { logger } from '../utils/logger';

export interface MovieResponse {
  page: number;
  results: unknown[];
  total_pages: number;
  total_results: number;
}

export interface CreditsResponse {
  id: number;
  cast: unknown[];
  crew: unknown[];
}

class MovieRepository {
  async getPopular(page: number = 1): Promise<MovieResponse> {
    logger.info('MovieRepository.getPopular', { page, mockMode: config.mockMode });

    if (config.mockMode) {
      const result = getMockMovies(page, 20);
      return { ...result, page };
    }

    return tmdbClient.get<MovieResponse>('/movie/popular', { page: page.toString() });
  }

  async search(query: string, page: number = 1): Promise<MovieResponse> {
    logger.info('MovieRepository.search', { query, page, mockMode: config.mockMode });

    if (config.mockMode) {
      const result = searchMockMovies(query);
      return { ...result, page };
    }

    return tmdbClient.get<MovieResponse>('/search/movie', {
      query,
      page: page.toString(),
    });
  }

  async getById(id: number): Promise<{ movie: unknown; credits: unknown }> {
    logger.info('MovieRepository.getById', { id, mockMode: config.mockMode });

    if (config.mockMode) {
      const movie = getMockMovieDetail(id);
      if (!movie) {
        throw new Error('Movie not found');
      }
      const credits = getMockCredits(id);
      return { movie, credits };
    }

    const [movie, credits] = await Promise.all([
      tmdbClient.get(`/movie/${id}`),
      tmdbClient.get(`/movie/${id}/credits`),
    ]);

    return { movie, credits: credits as CreditsResponse };
  }

  async getReviews(movieId: number): Promise<unknown[]> {
    logger.info('MovieRepository.getReviews', { movieId, mockMode: config.mockMode });

    if (config.mockMode) {
      return [];
    }

    const response = await tmdbClient.get(`/movie/${movieId}/reviews`);
    return (response as { results: unknown[] }).results;
  }
}

export const movieRepository = new MovieRepository();