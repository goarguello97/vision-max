import { Request, Response } from 'express';
import { movieService } from '../services/MovieService';
import { logger } from '../utils/logger';

export class MovieController {
  async getPopular(req: Request, res: Response): Promise<void> {
    const page = parseInt(req.query.page as string, 10) || 1;

    logger.info('Controller: getPopular', { page });

    const result = await movieService.getPopular(page);

    res.json({
      success: true,
      data: result,
    });
  }

  async search(req: Request, res: Response): Promise<void> {
    const query = req.query.query as string || '';
    const page = parseInt(req.query.page as string, 10) || 1;

    logger.info('Controller: search', { query, page });

    const result = await movieService.search(query, page);

    res.json({
      success: true,
      data: result,
    });
  }

  async getById(req: Request, res: Response): Promise<void> {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      res.status(400).json({
        success: false,
        message: 'ID de película inválido',
      });
      return;
    }

    logger.info('Controller: getById', { id });

    const result = await movieService.getById(id);

    res.json({
      success: true,
      data: result,
    });
  }

  async getReviews(req: Request, res: Response): Promise<void> {
    const movieId = parseInt(req.params.id, 10);

    if (isNaN(movieId)) {
      res.status(400).json({
        success: false,
        message: 'ID de película inválido',
      });
      return;
    }

    logger.info('Controller: getReviews', { movieId });

    const reviews = await movieService.getReviews(movieId);

    res.json({
      success: true,
      data: reviews,
    });
  }
}

export const movieController = new MovieController();