/**
 * @fileoverview Router de administración del sistema
 * @module routes/admin
 */

import { Router } from 'express';
import { adminController } from '../controllers/AdminController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { adminMiddleware } from '../middlewares/adminMiddleware';

const router = Router();

/**
 * Todas las rutas de administración requieren autenticación y rol de administrador
 */
router.use(authMiddleware);
router.use(adminMiddleware);

/**
 * @route GET /admin/users
 * @description Obtiene la lista de usuarios
 * @query {number} page - Número de página
 * @query {number} limit - Límite de resultados
 * @requires auth - Requiere autenticación
 * @requires admin - Requiere rol de administrador
 */
router.get('/users', adminController.getUsers);

/**
 * @route PUT /admin/users/:id/ban
 * @description Banea a un usuario
 * @param {number} id - ID del usuario
 * @requires auth - Requiere autenticación
 * @requires admin - Requiere rol de administrador
 */
router.put('/users/:id/ban', adminController.banUser);

/**
 * @route PUT /admin/users/:id/unban
 * @description Desbanea a un usuario
 * @param {number} id - ID del usuario
 * @requires auth - Requiere autenticación
 * @requires admin - Requiere rol de administrador
 */
router.put('/users/:id/unban', adminController.unbanUser);

/**
 * @route PUT /admin/users/:id/grant-admin
 * @description Concede permisos de administrador
 * @param {number} id - ID del usuario
 * @requires auth - Requiere autenticación
 * @requires admin - Requiere rol de administrador
 */
router.put('/users/:id/grant-admin', adminController.grantAdmin);

/**
 * @route DELETE /admin/reviews/:id
 * @description Elimina una reseña
 * @param {number} id - ID de la reseña
 * @requires auth - Requiere autenticación
 * @requires admin - Requiere rol de administrador
 */
router.delete('/reviews/:id', adminController.deleteReview);

/**
 * @route PUT /admin/reviews/:id
 * @description Actualiza la visibilidad de una reseña
 * @param {number} id - ID de la reseña
 * @body {boolean} isHidden - Estado de visibilidad
 * @requires auth - Requiere autenticación
 * @requires admin - Requiere rol de administrador
 */
router.put('/reviews/:id', adminController.updateReview);

/**
 * @route GET /admin/logs
 * @description Obtiene los logs de administración
 * @query {number} page - Número de página
 * @query {number} limit - Límite de resultados
 * @requires auth - Requiere autenticación
 * @requires admin - Requiere rol de administrador
 */
router.get('/logs', adminController.getLogs);

/**
 * @route GET /admin/stats
 * @description Obtiene estadísticas del sistema
 * @requires auth - Requiere autenticación
 * @requires admin - Requiere rol de administrador
 */
router.get('/stats', adminController.getStats);

export default router;