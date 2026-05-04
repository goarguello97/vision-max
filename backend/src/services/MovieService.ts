import config from '../config';
import { getMockMovies, searchMockMovies, getMockMovieDetail, getMockCredits, MockMovie, MockMovieDetail, MockCredits } from '../utils/mockTMDB';
import { NotFoundError } from '../utils/AppError';
import { logger } from '../utils/logger';

export interface MovieListResponse {
  page: number;
  results: Movie[];
  total_pages: number;
  total_results: number;
}

export interface Movie {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
  adult: boolean;
  original_language: string;
  original_title: string;
  popularity: number;
}

export interface MovieDetail extends Movie {
  runtime: number | null;
  genres: { id: number; name: string }[];
  budget: number;
  revenue: number;
  status: string;
  tagline: string | null;
  production_companies: { id: number; name: string }[];
}

export interface Credits {
  id: number;
  cast: {
    id: number;
    name: string;
    character: string;
    profile_path: string | null;
    order: number;
  }[];
  crew: {
    id: number;
    name: string;
    job: string;
    department: string;
  }[];
}

class MovieService {
  async getPopular(page: number = 1): Promise<MovieListResponse> {
    logger.info('Fetching popular movies', { page, mockMode: config.mockMode });

    if (config.mockMode) {
      const mockResult = getMockMovies(page, 20);
      return {
        page,
        results: mockResult.results as Movie[],
        total_pages: mockResult.total_pages,
        total_results: mockResult.total_results,
      };
    }

    throw new Error('Real TMDB API not implemented yet');
  }

  async search(query: string, page: number = 1): Promise<MovieListResponse> {
    logger.info('Searching movies', { query, page, mockMode: config.mockMode });

    if (!query || query.trim().length === 0) {
      return this.getPopular(page);
    }

    if (config.mockMode) {
      const mockResult = searchMockMovies(query);
      return {
        page: 1,
        results: mockResult.results as Movie[],
        total_pages: mockResult.total_pages,
        total_results: mockResult.total_results,
      };
    }

    throw new Error('Real TMDB API not implemented yet');
  }

  async getById(id: number): Promise<{ movie: MovieDetail; credits: Credits }> {
    logger.info('Fetching movie details', { id, mockMode: config.mockMode });

    if (config.mockMode) {
      const movie = getMockMovieDetail(id);
      if (!movie) {
        throw new NotFoundError(`Película con ID ${id} no encontrada`);
      }

      const credits = getMockCredits(id);
      return { movie: movie as MovieDetail, credits };
    }

    throw new Error('Real TMDB API not implemented yet');
  }

  async getReviews(movieId: number): Promise<{ id: number; author: string; content: string; rating: number }[]> {
    logger.info('Fetching movie reviews', { movieId });

    if (config.mockMode) {
      return [];
    }

    return [];
  }
}

export const movieService = new MovieService();