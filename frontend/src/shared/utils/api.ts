/**
 * @fileoverview Cliente API centralizado usando Axios
 * @module shared/utils/api
 */

import axios from 'axios';
import type {
  MovieResponse, MovieDetail, Credits,
  TvResponse, TvShowDetail, TvCredits,
  User, Review, AuthResponse, MediaType, SearchAllResponse
} from '../types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      return Promise.reject(error);
    }
    if (error.request) {
      const networkError = new Error('Error de conexión con el servidor');
      return Promise.reject(networkError);
    }
    return Promise.reject(error);
  }
);

export const movieApi = {
  getPopular: (page = 1) =>
    api.get<{ success: boolean; data: MovieResponse }>(`/movies?page=${page}`),

  search: (query: string, page = 1) =>
    api.get<{ success: boolean; data: MovieResponse }>(`/movies/search?query=${query}&page=${page}`),

  getById: (id: number) =>
    api.get<{ success: boolean; data: { movie: MovieDetail; credits: Credits } }>(`/movies/${id}`),
};

export const tvApi = {
  getPopular: (page = 1) =>
    api.get<{ success: boolean; data: TvResponse }>(`/tv?page=${page}`),

  search: (query: string, page = 1) =>
    api.get<{ success: boolean; data: TvResponse }>(`/tv/search?query=${query}&page=${page}`),

  getById: (id: number) =>
    api.get<{ success: boolean; data: { tv: TvShowDetail; credits: TvCredits } }>(`/tv/${id}`),
};

export const searchApi = {
  searchAll: (query: string, page = 1) =>
    api.get<{ success: boolean; data: SearchAllResponse }>(`/search/all?query=${query}&page=${page}`),
};

export const authApi = {
  register: (data: { email: string; password: string; username: string }) =>
    api.post<AuthResponse>('/auth/register', data),

  login: (data: { email: string; password: string }) =>
    api.post<AuthResponse>('/auth/login', data),

  logout: () =>
    api.post<{ success: boolean }>('/auth/logout'),

  me: () =>
    api.get<{ success: boolean; data: User }>('/auth/me'),

  checkUsername: (username: string) =>
    api.get<{ available: boolean }>('/auth/check-username', { params: { username } }),

  checkEmail: (email: string) =>
    api.get<{ available: boolean }>('/auth/check-email', { params: { email } }),
};

export const favoritesApi = {
  getAll: (page = 1, limit = 20, mediaType?: MediaType) => {
    const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
    if (mediaType) params.append('mediaType', mediaType);
    return api.get<{ success: boolean; data: { favorites: { mediaId: number; mediaType: MediaType }[]; total: number } }>(`/favorites?${params}`);
  },

  add: (mediaId: number, mediaType: MediaType) =>
    api.post<{ success: boolean }>(`/favorites/${mediaType}/${mediaId}`),

  remove: (mediaId: number, mediaType: MediaType) =>
    api.delete<{ success: boolean }>(`/favorites/${mediaType}/${mediaId}`),
};

export const reviewsApi = {
  create: (data: { mediaId: number; mediaType: MediaType; content: string; rating: number }) =>
    api.post<{ success: boolean }>('/reviews', data),

  update: (id: number, data: { content?: string; rating?: number }) =>
    api.put<{ success: boolean }>(`/reviews/${id}`, data),

  delete: (id: number) =>
    api.delete<{ success: boolean }>(`/reviews/${id}`),

  getByMedia: (mediaId: number, mediaType: MediaType, page = 1) =>
    api.get<{ success: boolean; data: { reviews: Review[]; total: number } }>(`/reviews/${mediaType}/${mediaId}?page=${page}`),
};

export const adminApi = {
  getUsers: (page = 1, limit = 20) =>
    api.get<{ success: boolean; data: { users: User[]; total: number } }>(`/admin/users?page=${page}&limit=${limit}`),

  banUser: (userId: number) =>
    api.put<{ success: boolean }>(`/admin/users/${userId}/ban`),

  unbanUser: (userId: number) =>
    api.put<{ success: boolean }>(`/admin/users/${userId}/unban`),

  grantAdmin: (userId: number) =>
    api.put<{ success: boolean }>(`/admin/users/${userId}/grant-admin`),

  deleteReview: (reviewId: number) =>
    api.delete<{ success: boolean }>(`/admin/reviews/${reviewId}`),

  getStats: () =>
    api.get<{ success: boolean; data: { totalUsers: number; totalAdmins: number; bannedUsers: number; totalReviews: number; hiddenReviews: number; totalFavorites: number } }>('/admin/stats'),
};

export default api;