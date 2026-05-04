/**
 * @fileoverview Router de autenticación
 * @module routes/auth
 */

import { Router } from 'express';
import { authController } from '../controllers/AuthController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { validate } from '../middlewares/validateMiddleware';
import { registerSchema, loginSchema } from '../models/schemas';

const router = Router();

/**
 * @route POST /auth/register
 * @description Registra un nuevo usuario en el sistema
 */
router.post('/register', validate(registerSchema), authController.register);

/**
 * @route POST /auth/login
 * @description Inicia sesión de usuario
 */
router.post('/login', validate(loginSchema), authController.login);

/**
 * @route POST /auth/logout
 * @description Cierra la sesión del usuario
 */
router.post('/logout', authController.logout);

/**
 * @route GET /auth/me
 * @description Obtiene el usuario autenticado actual
 * @requires auth - Requiere autenticación
 */
router.get('/me', authMiddleware, authController.me);

export default router;