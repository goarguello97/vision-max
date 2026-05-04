import { Router } from 'express';
import moviesRouter from './movies';
import authRouter from './auth';
import favoritesRouter from './favorites';
import reviewsRouter from './reviews';
import adminRouter from './admin';

const router = Router();

router.use('/auth', authRouter);
router.use('/movies', moviesRouter);
router.use('/favorites', favoritesRouter);
router.use('/reviews', reviewsRouter);
router.use('/admin', adminRouter);

router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'visionmax-api',
  });
});

export default router;