/**
 * @fileoverview Utilidades para el manejo de JSON Web Tokens (JWT)
 * @module utils/jwt
 */

import jwt from 'jsonwebtoken';
import config from '../config';
import { UserPayload } from '../models/User';

/**
 * Genera un token JWT para un usuario.
 * @function generateToken
 * @param {UserPayload} user - Payload con datos del usuario
 * @returns {string} Token JWT firmado
 */
export const generateToken = (user: UserPayload): string => {
  return jwt.sign(user, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  } as jwt.SignOptions);
};

/**
 * Verifica y decodifica un token JWT.
 * @function verifyToken
 * @param {string} token - Token JWT a verificar
 * @returns {UserPayload} Payload decodificado del usuario
 * @throws {jwt.JsonWebTokenError} Si el token es inválido
 */
export const verifyToken = (token: string): UserPayload => {
  return jwt.verify(token, config.jwt.secret) as UserPayload;
};

/**
 * Opciones de configuración para la cookie del token.
 * @constant {Object}
 */
export const tokenCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};