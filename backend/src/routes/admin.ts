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
 * @swagger
 * /admin/users:
 *   get:
 *     tags: [Admin]
 *     summary: Get all users
 *     description: Returns a list of all users (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Results per page
 *     responses:
 *       200:
 *         description: List of users
 *       403:
 *         description: Forbidden - Admin only
 */
router.get('/users', adminController.getUsers);

/**
 * @swagger
 * /admin/users/{id}/ban:
 *   put:
 *     tags: [Admin]
 *     summary: Ban user
 *     description: Bans a user (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       200:
 *         description: User banned
 *       404:
 *         description: User not found
 */
router.put('/users/:id/ban', adminController.banUser);

/**
 * @swagger
 * /admin/users/{id}/unban:
 *   put:
 *     tags: [Admin]
 *     summary: Unban user
 *     description: Unbans a user (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       200:
 *         description: User unbanned
 *       404:
 *         description: User not found
 */
router.put('/users/:id/unban', adminController.unbanUser);

/**
 * @swagger
 * /admin/users/{id}/grant-admin:
 *   put:
 *     tags: [Admin]
 *     summary: Grant admin role
 *     description: Grants admin role to a user (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       200:
 *         description: Admin role granted
 *       404:
 *         description: User not found
 */
router.put('/users/:id/grant-admin', adminController.grantAdmin);

/**
 * @swagger
 * /admin/reviews/{id}:
 *   delete:
 *     tags: [Admin]
 *     summary: Delete review
 *     description: Deletes any review (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Review ID
 *     responses:
 *       200:
 *         description: Review deleted
 *       404:
 *         description: Review not found
 */
router.delete('/reviews/:id', adminController.deleteReview);

/**
 * @swagger
 * /admin/reviews/{id}:
 *   put:
 *     tags: [Admin]
 *     summary: Update review visibility
 *     description: Updates review visibility (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Review ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isHidden:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Review updated
 *       404:
 *         description: Review not found
 */
router.put('/reviews/:id', adminController.updateReview);

/**
 * @swagger
 * /admin/logs:
 *   get:
 *     tags: [Admin]
 *     summary: Get admin logs
 *     description: Returns admin activity logs (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Results per page
 *     responses:
 *       200:
 *         description: List of admin logs
 */
router.get('/logs', adminController.getLogs);

/**
 * @swagger
 * /admin/stats:
 *   get:
 *     tags: [Admin]
 *     summary: Get system statistics
 *     description: Returns system statistics (admin only)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System statistics
 */
router.get('/stats', adminController.getStats);

export default router;