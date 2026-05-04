import { userRepository } from '../repositories/UserRepository';
import { hashPassword, comparePassword } from '../utils/bcrypt';
import { generateToken } from '../utils/jwt';
import { AuthUser, UserPayload } from '../models/User';
import { ConflictError, UnauthorizedError, NotFoundError, ForbiddenError } from '../utils/AppError';
import { RegisterInput, LoginInput } from '../models/schemas';
import { logger } from '../utils/logger';

export class AuthService {
  async register(input: RegisterInput): Promise<{ user: AuthUser; token: string }> {
    logger.info('AuthService.register', { email: input.email });

    const existingUser = await userRepository.findByEmail(input.email);
    if (existingUser) {
      throw new ConflictError('El email ya está registrado');
    }

    const passwordHash = await hashPassword(input.password);

    const user = await userRepository.create({
      email: input.email,
      passwordHash,
      username: input.username,
    });

    const payload: UserPayload = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    };

    const token = generateToken(payload);

    logger.info('User registered successfully', { userId: user.id });

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

  async login(input: LoginInput): Promise<{ user: AuthUser; token: string }> {
    logger.info('AuthService.login', { email: input.email });

    const user = await userRepository.findByEmail(input.email);
    if (!user) {
      throw new UnauthorizedError('Credenciales inválidas');
    }

    const isValidPassword = await comparePassword(input.password, user.passwordHash);
    if (!isValidPassword) {
      throw new UnauthorizedError('Credenciales inválidas');
    }

    if (user.isBanned) {
      throw new ForbiddenError('Usuario baneado');
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