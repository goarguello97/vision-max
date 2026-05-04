/**
 * @fileoverview Utilidades para el manejo de contraseñas usando bcrypt
 * @module utils/bcrypt
 */

import bcrypt from 'bcryptjs';

/**
 * Número de rondas de sal para el hashing.
 * @constant {number}
 */
const SALT_ROUNDS = 10;

/**
 * Genera el hash de una contraseña usando bcrypt.
 * @async
 * @function hashPassword
 * @param {string} password - Contraseña en texto plano
 * @returns {Promise<string>} Hash de la contraseña
 */
export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

/**
 * Compara una contraseña en texto plano con un hash almacenado.
 * @async
 * @function comparePassword
 * @param {string} password - Contraseña en texto plano
 * @param {string} hash - Hash almacenado de la contraseña
 * @returns {Promise<boolean>} true si la contraseña coincide
 */
export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};