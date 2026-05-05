/**
 * @fileoverview Controlador de búsqueda unificada
 * @module controllers/SearchController
 */

import { Request, Response } from 'express';
import { movieService } from '../services/MovieService';
import { tvService } from '../services/TvService';
import { logger } from '../utils/logger';

export class SearchController {
  async searchAll(req: Request, res: Response): Promise<void> {
    const query = req.query.query as string || '';
    const page = parseInt(req.query.page as string, 10) || 1;

    logger.info('Controller: searchAll', { query, page });

    const [moviesResult, tvResult] = await Promise.all([
      movieService.search(query, page),
      tvService.search(query, page),
    ]);

    res.json({
      success: true,
      data: {
        movies: moviesResult,
        tv: tvResult,
      },
    });
  }
}

export const searchController = new SearchController();