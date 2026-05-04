/**
 * @fileoverview Middlewares de validación usando Zod
 * @module middlewares/validateMiddleware
 */

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * Middleware factory que valida el body de la request contra un esquema Zod.
 * @function validate
 * @param {ZodSchema} schema - Esquema Zod para validación
 * @returns {Function} Middleware de Express
 */
export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
        return;
      }
      next(error);
    }
  };
};

/**
 * Middleware factory que valida los query parameters contra un esquema Zod.
 * @function validateQuery
 * @param {ZodSchema} schema - Esquema Zod para validación
 * @returns {Function} Middleware de Express
 */
export const validateQuery = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
        return;
      }
      next(error);
    }
  };
};