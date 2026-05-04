import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import config from '../config';
import { logger } from './logger';

class TMDBClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.tmdb.baseUrl,
      timeout: 10000,
      params: {
        api_key: config.tmdb.apiKey,
        language: 'es-ES',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        logger.debug(`TMDB Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error: AxiosError) => {
        logger.error('TMDB Request Error', {
          message: error.message,
          url: error.config?.url,
        });
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        logger.debug(`TMDB Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error: AxiosError) => {
        if (error.response) {
          logger.error('TMDB Response Error', {
            status: error.response.status,
            statusText: error.response.statusText,
            url: error.config?.url,
          });
        } else if (error.request) {
          logger.error('TMDB Network Error', {
            message: error.message,
            url: error.config?.url,
          });
        } else {
          logger.error('TMDB Error', {
            message: error.message,
          });
        }
        return Promise.reject(error);
      }
    );
  }

  async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const response = await this.client.get<T>(endpoint, { params });
    return response.data;
  }
}

export const tmdbClient = new TMDBClient();