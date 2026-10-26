// Formato único de error de la API para todos los módulos (ver 00-decisiones.md).
export interface ApiError {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string>;
    meta?: Record<string, unknown>;
  };
}

export interface HealthResponse {
  status: 'ok';
  db: 'up' | 'down';
  uptimeSec: number;
}
