import config from '../config';
import { TMDB_CONFIG } from '../config/tmdb';
import { getMockMovies, searchMockMovies, getMockMovieDetail, getMockCredits } from '../utils/mockTMDB';
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
  private async fetchFromTMDB(endpoint: string, params: Record<string, string> = {}): Promise<unknown> {
    const url = new URL(`${TMDB_CONFIG.baseUrl}${endpoint}`);
    url.searchParams.set('api_key', TMDB_CONFIG.apiKey);
    url.searchParams.set('language', TMDB_CONFIG.language);

    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getPopular(page: number = 1): Promise<MovieResponse> {
    logger.info('MovieRepository.getPopular', { page, mockMode: config.mockMode });

    if (config.mockMode) {
      const result = getMockMovies(page, 20);
      return { ...result, page };
    }

    return this.fetchFromTMDB('/movie/popular', { page: page.toString() }) as Promise<MovieResponse>;
  }

  async search(query: string, page: number = 1): Promise<MovieResponse> {
    logger.info('MovieRepository.search', { query, page, mockMode: config.mockMode });

    if (config.mockMode) {
      const result = searchMockMovies(query);
      return { ...result, page };
    }

    return this.fetchFromTMDB('/search/movie', {
      query,
      page: page.toString(),
    }) as Promise<MovieResponse>;
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
      this.fetchFromTMDB(`/movie/${id}`),
      this.fetchFromTMDB(`/movie/${id}/credits`),
    ]);

    return { movie, credits: credits as CreditsResponse };
  }

  async getReviews(movieId: number): Promise<unknown[]> {
    logger.info('MovieRepository.getReviews', { movieId, mockMode: config.mockMode });

    if (config.mockMode) {
      return [];
    }

    const response = await this.fetchFromTMDB(`/movie/${movieId}/reviews`);
    return (response as { results: unknown[] }).results;
  }
}

export const movieRepository = new MovieRepository();