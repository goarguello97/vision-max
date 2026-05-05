/**
 * @fileoverview Hooks para gestionar series de TV
 * @module shared/hooks/useTvShows
 */

import { useState, useEffect, useCallback } from 'react';
import { tvApi, reviewsApi } from '../utils/api';
import type { TvShow, TvShowDetail, TvCredits, Review } from '../types';

interface UseTvShowsReturn {
  tvShows: TvShow[];
  isLoading: boolean;
  error: string | null;
  totalPages: number;
  totalResults: number;
  loadTvShows: (page?: number) => Promise<void>;
  searchTvShows: (query: string, page?: number) => Promise<void>;
}

export function useTvShows(): UseTvShowsReturn {
  const [tvShows, setTvShows] = useState<TvShow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [totalResults, setTotalResults] = useState(0);

  const loadTvShows = useCallback(async (page = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await tvApi.getPopular(page);
      if (response.data.success) {
        setTvShows(response.data.data.results);
        setTotalPages(response.data.data.total_pages);
        setTotalResults(response.data.data.total_results);
      }
    } catch {
      setError('Error al cargar series');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const searchTvShows = useCallback(async (query: string, page = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await tvApi.search(query, page);
      if (response.data.success) {
        setTvShows(response.data.data.results);
        setTotalPages(response.data.data.total_pages);
        setTotalResults(response.data.data.total_results);
      }
    } catch {
      setError('Error al buscar series');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTvShows();
  }, [loadTvShows]);

  return { tvShows, isLoading, error, totalPages, totalResults, loadTvShows, searchTvShows };
}

interface UseTvDetailReturn {
  tv: TvShowDetail | null;
  credits: TvCredits | null;
  reviews: Review[];
  isLoading: boolean;
  error: string | null;
}

export function useTvDetail(id: number): UseTvDetailReturn {
  const [tv, setTv] = useState<TvShowDetail | null>(null);
  const [credits, setCredits] = useState<TvCredits | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [tvResponse, reviewsResponse] = await Promise.all([
          tvApi.getById(id),
          reviewsApi.getByMedia(id, 'TV'),
        ]);

        if (tvResponse.data.success) {
          setTv(tvResponse.data.data.tv);
          setCredits(tvResponse.data.data.credits);
        }

        if (reviewsResponse.data.success) {
          setReviews(reviewsResponse.data.data.reviews);
        }
      } catch {
        setError('Error al cargar detalles de la serie');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id]);

  return { tv, credits, reviews, isLoading, error };
}