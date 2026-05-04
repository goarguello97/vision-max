import prisma from '../database/client';
import { User, Role } from '@prisma/client';
import { UserResponse } from '../models/User';
import { ConflictError, NotFoundError } from '../utils/AppError';

export class UserRepository {
  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  async findById(id: number): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  async create(data: {
    email: string;
    passwordHash: string;
    username: string;
  }): Promise<User> {
    return prisma.user.create({
      data,
    });
  }

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

  async updateRole(userId: number, role: Role): Promise<User> {
    return prisma.user.update({
      where: { id: userId },
      data: { role },
    });
  }

  async updateBanStatus(userId: number, isBanned: boolean): Promise<User> {
    return prisma.user.update({
      where: { id: userId },
      data: { isBanned },
    });
  }

  async count(): Promise<number> {
    return prisma.user.count();
  }

  async countByRole(role: Role): Promise<number> {
    return prisma.user.count({ where: { role } });
  }

  async countBanned(): Promise<number> {
    return prisma.user.count({ where: { isBanned: true } });
  }
}

export const userRepository = new UserRepository();