/**
 * @fileoverview Router de reseñas
 * @module routes/reviews
 */

import { Router } from 'express';
import { reviewController } from '../controllers/ReviewController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();

router.post('/', authMiddleware, reviewController.create);

router.put('/:id', authMiddleware, reviewController.update);

router.delete('/:id', authMiddleware, reviewController.delete);

router.get('/:mediaType/:mediaId', reviewController.getByMedia);

router.get('/user/:mediaType/:mediaId', authMiddleware, reviewController.getUserReviewForMedia);

export default router;