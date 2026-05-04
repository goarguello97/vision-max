import { useState, useEffect, useCallback } from 'react';
import { movieApi } from '../utils/api';
import type { Movie, MovieDetail, Credits, Review } from '../types';

interface UseMoviesReturn {
  movies: Movie[];
  isLoading: boolean;
  error: string | null;
  totalPages: number;
  totalResults: number;
  loadMovies: (page?: number) => Promise<void>;
  searchMovies: (query: string, page?: number) => Promise<void>;
}

export function useMovies(): UseMoviesReturn {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [totalResults, setTotalResults] = useState(0);

  const loadMovies = useCallback(async (page = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await movieApi.getPopular(page);
      if (response.data.success) {
        setMovies(response.data.data.results);
        setTotalPages(response.data.data.total_pages);
        setTotalResults(response.data.data.total_results);
      }
    } catch (err) {
      setError('Failed to load movies');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const searchMovies = useCallback(async (query: string, page = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await movieApi.search(query, page);
      if (response.data.success) {
        setMovies(response.data.data.results);
        setTotalPages(response.data.data.total_pages);
        setTotalResults(response.data.data.total_results);
      }
    } catch (err) {
      setError('Failed to search movies');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMovies();
  }, [loadMovies]);

  return { movies, isLoading, error, totalPages, totalResults, loadMovies, searchMovies };
}

interface UseMovieDetailReturn {
  movie: MovieDetail | null;
  credits: Credits | null;
  reviews: Review[];
  isLoading: boolean;
  error: string | null;
}

export function useMovieDetail(id: number): UseMovieDetailReturn {
  const [movie, setMovie] = useState<MovieDetail | null>(null);
  const [credits, setCredits] = useState<Credits | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [movieResponse, reviewsResponse] = await Promise.all([
          movieApi.getById(id),
          movieApi.getReviews(id),
        ]);

        if (movieResponse.data.success) {
          setMovie(movieResponse.data.data.movie);
          setCredits(movieResponse.data.data.credits);
        }

        if (reviewsResponse.data.success) {
          setReviews(reviewsResponse.data.data.reviews);
        }
      } catch (err) {
        setError('Failed to load movie details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id]);

  return { movie, credits, reviews, isLoading, error };
}