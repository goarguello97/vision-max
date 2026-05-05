/**
 * @fileoverview Repositorio para operaciones de base de datos de usuarios
 * @module repositories/UserRepository
 */

import prisma from '../database/client';
import { User, Role } from '@prisma/client';
import { UserResponse } from '../models/User';

/**
 * Repositorio que maneja todas las operaciones de base de datos relacionadas con usuarios.
 * @class UserRepository
 */
export class UserRepository {
  /**
   * Busca un usuario por su email.
   * @async
   * @method findByEmail
   * @param {string} email - Email del usuario
   * @returns {Promise<User | null>} Usuario encontrado o null
   */
  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  /**
   * Busca un usuario por su ID.
   * @async
   * @method findById
   * @param {number} id - ID del usuario
   * @returns {Promise<User | null>} Usuario encontrado o null
   */
  async findById(id: number): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  /**
   * Busca un usuario por su username.
   * @async
   * @method findByUsername
   * @param {string} username - Username del usuario
   * @returns {Promise<User | null>} Usuario encontrado o null
   */
  async findByUsername(username: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { username },
    });
  }

  /**
   * Crea un nuevo usuario en la base de datos.
   * @async
   * @method create
   * @param {Object} data - Datos del usuario
   * @returns {Promise<User>} Usuario creado
   */
  async create(data: {
    email: string;
    passwordHash: string;
    username: string;
  }): Promise<User> {
    return prisma.user.create({
      data,
    });
  }

  /**
   * Obtiene una lista paginada de usuarios.
   * @async
   * @method findAll
   * @param {number} [page=1] - Número de página
   * @param {number} [limit=20] - Cantidad de usuarios por página
   * @returns {Promise<{users: UserResponse[], total: number}>} Lista de usuarios y total
   */
  async findAll(page: number = 1, limit: number = 20): Promise<{ users: UserResponse[]; total: number }> {
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          username: true,
          role: true,
          createdAt: true,
        },
      }),
      prisma.user.count(),
    ]);

    return { users, total };
  }

  /**
   * Actualiza el rol de un usuario.
   * @async
   * @method updateRole
   * @param {number} userId - ID del usuario
   * @param {Role} role - Nuevo rol
   * @returns {Promise<User>} Usuario actualizado
   */
  async updateRole(userId: number, role: Role): Promise<User> {
    return prisma.user.update({
      where: { id: userId },
      data: { role },
    });
  }

  /**
   * Actualiza el estado de banned de un usuario.
   * @async
   * @method updateBanStatus
   * @param {number} userId - ID del usuario
   * @param {boolean} isBanned - Estado de banned
   * @returns {Promise<User>} Usuario actualizado
   */
  async updateBanStatus(userId: number, isBanned: boolean): Promise<User> {
    return prisma.user.update({
      where: { id: userId },
      data: { isBanned },
    });
  }

  /**
   * Cuenta el total de usuarios en el sistema.
   * @async
   * @method count
   * @returns {Promise<number>} Total de usuarios
   */
  async count(): Promise<number> {
    return prisma.user.count();
  }

  /**
   * Cuenta usuarios por rol específico.
   * @async
   * @method countByRole
   * @param {Role} role - Rol a buscar
   * @returns {Promise<number>} Total de usuarios con ese rol
   */
  async countByRole(role: Role): Promise<number> {
    return prisma.user.count({ where: { role } });
  }

  /**
   * Cuenta el total de usuarios baneados.
   * @async
   * @method countBanned
   * @returns {Promise<number>} Total de usuarios baneados
   */
  async countBanned(): Promise<number> {
    return prisma.user.count({ where: { isBanned: true } });
  }
}

export const userRepository = new UserRepository();