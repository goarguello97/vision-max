/**
 * @fileoverview Servicio de autenticación de usuarios
 * @module services/AuthService
 */

import { userRepository } from '../repositories/UserRepository';
import { hashPassword, comparePassword } from '../utils/bcrypt';
import { generateToken } from '../utils/jwt';
import { AuthUser, UserPayload } from '../models/User';
import { ConflictError, UnauthorizedError, NotFoundError, ForbiddenError } from '../utils/AppError';
import { RegisterInput, LoginInput } from '../models/schemas';
import { logger } from '../utils/logger';

/**
 * Servicio que maneja las operaciones de autenticación de usuarios.
 * Proporciona métodos para registro, login y obtención de información del usuario.
 * @class AuthService
 */
export class AuthService {
  /**
   * Registra un nuevo usuario en el sistema.
   * @async
   * @method register
   * @param {RegisterInput} input - Datos de registro del usuario
   * @returns {Promise<AuthUser>} Usuario creado
   * @throws {ConflictError} Si el email ya está registrado
   */
  async register(input: RegisterInput): Promise<AuthUser> {
    logger.info('AuthService.register', { email: input.email });

    const existingEmail = await userRepository.findByEmail(input.email);
    if (existingEmail) {
      throw new ConflictError('El email ya está registrado');
    }

    const existingUsername = await userRepository.findByUsername(input.username);
    if (existingUsername) {
      throw new ConflictError('El nombre de usuario ya está en uso');
    }

    const passwordHash = await hashPassword(input.password);

    const user = await userRepository.create({
      email: input.email,
      passwordHash,
      username: input.username,
    });

    logger.info('User registered successfully', { userId: user.id });

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      isBanned: user.isBanned,
    };
  }

  /**
   * Autentica a un usuario con sus credenciales.
   * @async
   * @method login
   * @param {LoginInput} input - Credenciales del usuario
   * @returns {Promise<{user: AuthUser, token: string}>} Usuario autenticado y token JWT
   * @throws {UnauthorizedError} Si las credenciales son inválidas
   * @throws {ForbiddenError} Si el usuario está baneado
   */
  async login(input: LoginInput): Promise<{ user: AuthUser; token: string }> {
    logger.info('AuthService.login', { email: input.email });

    const user = await userRepository.findByEmail(input.email);
    
    if (!user) {
      throw new UnauthorizedError('Credenciales inválidas');
    }

    if (user.isBanned) {
      throw new ForbiddenError('Usuario baneado');
    }

    const isValidPassword = await comparePassword(input.password, user.passwordHash);
    if (!isValidPassword) {
      throw new UnauthorizedError('Credenciales inválidas');
    }

    const payload: UserPayload = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    };

    const token = generateToken(payload);

    logger.info('User logged in successfully', { userId: user.id });

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        isBanned: user.isBanned,
      },
      token,
    };
  }

  /**
   * Obtiene la información del usuario autenticado.
   * @async
   * @method getMe
   * @param {number} userId - ID del usuario
   * @returns {Promise<AuthUser>} Datos del usuario
   * @throws {NotFoundError} Si el usuario no existe
   */
  async getMe(userId: number): Promise<AuthUser> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('Usuario no encontrado');
    }

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      isBanned: user.isBanned,
    };
  }
}

export const authService = new AuthService();