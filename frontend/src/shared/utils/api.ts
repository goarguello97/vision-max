/**
 * @fileoverview Cliente API centralizado usando Axios
 * @module shared/utils/api
 */

import axios from 'axios';
import type { MovieResponse, MovieDetail, Credits, User, Review, AuthResponse } from '../types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const movieApi = {
  getPopular: (page = 1) =>
    api.get<{ success: boolean; data: MovieResponse }>(`/movies?page=${page}`),

  search: (query: string, page = 1) =>
    api.get<{ success: boolean; data: MovieResponse }>(`/movies/search?query=${query}&page=${page}`),

  getById: (id: number) =>
    api.get<{ success: boolean; data: { movie: MovieDetail; credits: Credits } }>(`/movies/${id}`),

  getReviews: (movieId: number, page = 1) =>
    api.get<{ success: boolean; data: { reviews: Review[]; total: number } }>(`/movies/${movieId}/reviews?page=${page}`),
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
};

export const favoritesApi = {
  getAll: (page = 1, limit = 20) =>
    api.get<{ success: boolean; data: { favorites: { movieId: number }[]; total: number } }>(`/favorites?page=${page}&limit=${limit}`),

  add: (movieId: number) =>
    api.post<{ success: boolean }>(`/favorites/${movieId}`),

  remove: (movieId: number) =>
    api.delete<{ success: boolean }>(`/favorites/${movieId}`),
};

export const reviewsApi = {
  create: (data: { movieId: number; content: string; rating: number }) =>
    api.post<{ success: boolean }>('/reviews', data),

  update: (id: number, data: { content?: string; rating?: number }) =>
    api.put<{ success: boolean }>(`/reviews/${id}`, data),

  delete: (id: number) =>
    api.delete<{ success: boolean }>(`/reviews/${id}`),
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