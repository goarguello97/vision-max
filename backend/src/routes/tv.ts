/**
 * @fileoverview Router de series de TV
 * @module routes/tv
 */

import { Router } from 'express';
import { tvController } from '../controllers/TvController';

const router = Router();

router.get('/', tvController.getPopular);

router.get('/search', tvController.search);

router.get('/:id', tvController.getById);

router.get('/:id/reviews', tvController.getReviews);

export default router;