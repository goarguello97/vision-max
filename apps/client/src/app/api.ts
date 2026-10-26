import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';
import type { ApiError, HealthResponse } from '@vision-max/shared';
import { refreshSession } from '../features/auth/session';
import { API_URL } from './config';
import type { RootState } from './store';

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_URL,
  credentials: 'include',
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.accessToken;
    if (token && !headers.has('authorization')) headers.set('authorization', `Bearer ${token}`);
    return headers;
  },
});

// Ante 401 TOKEN_EXPIRED renueva la sesión una vez (single-flight) y reintenta la request original.
const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  let result = await rawBaseQuery(args, api, extraOptions);
  const code = (result.error?.data as ApiError | undefined)?.error?.code;
  if (result.error?.status === 401 && code === 'TOKEN_EXPIRED') {
    if (await refreshSession(api.dispatch)) {
      result = await rawBaseQuery(args, api, extraOptions);
    }
  }
  return result;
};

// API base de RTK Query. Cada módulo (auth, catalog, favorites) inyecta sus endpoints con injectEndpoints.
export const api = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Me'],
  endpoints: (build) => ({
    getHealth: build.query<HealthResponse, void>({ query: () => '/health' }),
  }),
});

export const { useGetHealthQuery } = api;

// Extrae el error con el formato común de la API. `network` cubre el caso borde 21 (sin conexión).
export function readApiError(error: unknown): { network: true } | ({ network: false } & ApiError['error']) | null {
  if (typeof error !== 'object' || error === null || !('status' in error)) return null;
  const { status, data } = error as FetchBaseQueryError;
  if (status === 'FETCH_ERROR' || status === 'TIMEOUT_ERROR') return { network: true };
  const body = data as ApiError | undefined;
  return body?.error ? { network: false, ...body.error } : null;
}

export const NETWORK_ERROR_MESSAGE = 'No pudimos conectarnos. Revisá tu conexión.';
export const GENERIC_ERROR_MESSAGE = 'Algo salió mal. Probá de nuevo en un momento.';
