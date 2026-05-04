import config from './index';

export const TMDB_CONFIG = {
  apiKey: config.tmdb.apiKey,
  baseUrl: config.tmdb.baseUrl,
  imageUrl: config.tmdb.imageUrl,
  language: 'es-ES',
  mockMode: config.mockMode,
};

export const IMAGE_SIZES = {
  poster: {
    small: 'w185',
    medium: 'w342',
    large: 'w500',
    original: 'original',
  },
  backdrop: {
    small: 'w300',
    medium: 'w780',
    large: 'w1280',
    original: 'original',
  },
};

export function getImageUrl(path: string, size: string = IMAGE_SIZES.poster.medium): string {
  if (!path) return '';
  return `${TMDB_CONFIG.imageUrl}/${size}${path}`;
}