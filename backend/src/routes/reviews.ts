/**
 * @fileoverview Router de reseñas de películas
 * @module routes/reviews
 */

import { Router } from 'express';
import { reviewController } from '../controllers/ReviewController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();

/**
 * @swagger
 * /reviews:
 *   post:
 *     tags: [Reviews]
 *     summary: Create a review
 *     description: Creates a new review for a movie
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - movieId
 *               - content
 *               - rating
 *             properties:
 *               movieId:
 *                 type: integer
 *                 description: TMDB movie ID
 *               content:
 *                 type: string
 *                 description: Review text
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 description: Rating 1-5
 *     responses:
 *       201:
 *         description: Review created
 *       400:
 *         description: Validation error
 */
router.post('/', authMiddleware, reviewController.create);

/**
 * @swagger
 * /reviews/{id}:
 *   put:
 *     tags: [Reviews]
 *     summary: Update a review
 *     description: Updates an existing review
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
 *               content:
 *                 type: string
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *     responses:
 *       200:
 *         description: Review updated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Review not found
 */
router.put('/:id', authMiddleware, reviewController.update);

/**
 * @swagger
 * /reviews/{id}:
 *   delete:
 *     tags: [Reviews]
 *     summary: Delete a review
 *     description: Deletes a review
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
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Review not found
 */
router.delete('/:id', authMiddleware, reviewController.delete);

export default router;