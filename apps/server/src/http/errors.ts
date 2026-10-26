import type { ApiError } from '@vision-max/shared';
import type { z } from 'zod';

export function apiError(
  code: string,
  message: string,
  extra?: Pick<ApiError['error'], 'fields' | 'meta'>,
): ApiError {
  return { error: { code, message, ...extra } };
}

// Error con respuesta HTTP: los handlers lo tiran y el middleware de errores de app.ts lo serializa.
export class HttpError extends Error {
  readonly body: ApiError;

  constructor(
    readonly status: number,
    code: string,
    message: string,
    extra?: Pick<ApiError['error'], 'fields' | 'meta'>,
  ) {
    super(message);
    this.body = apiError(code, message, extra);
  }
}

// Valida con un esquema de packages/shared. Ante error responde 400 con el primer mensaje de cada campo.
export function validate<S extends z.ZodType>(schema: S, data: unknown): z.output<S> {
  const result = schema.safeParse(data ?? {});
  if (result.success) return result.data;

  const fields: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? '_');
    fields[key] ??= issue.message;
  }
  throw new HttpError(400, 'VALIDATION_ERROR', 'Revisá los campos marcados.', { fields });
}
