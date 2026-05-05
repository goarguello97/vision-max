/**
 * @fileoverview Controlador de series de TV
 * @module controllers/TvController
 */

import { Request, Response } from 'express';
import { tvService } from '../services/TvService';
import { logger } from '../utils/logger';

export class TvController {
  async getPopular(req: Request, res: Response): Promise<void> {
    const page = parseInt(req.query.page as string, 10) || 1;
    logger.info('Controller: getPopularTv', { page });

    const result = await tvService.getPopular(page);
    res.json({ success: true, data: result });
  }

  async search(req: Request, res: Response): Promise<void> {
    const query = req.query.query as string || '';
    const page = parseInt(req.query.page as string, 10) || 1;
    logger.info('Controller: searchTv', { query, page });

    const result = await tvService.search(query, page);
    res.json({ success: true, data: result });
  }

  async getById(req: Request, res: Response): Promise<void> {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      res.status(400).json({ success: false, message: 'ID de serie inválido' });
      return;
    }

    logger.info('Controller: getTvById', { id });
    const result = await tvService.getById(id);
    res.json({ success: true, data: result });
  }

  async getReviews(req: Request, res: Response): Promise<void> {
    const tvId = parseInt(req.params.id, 10);

    if (isNaN(tvId)) {
      res.status(400).json({ success: false, message: 'ID de serie inválido' });
      return;
    }

    logger.info('Controller: getTvReviews', { tvId });
    const reviews = await tvService.getReviews(tvId);
    res.json({ success: true, data: reviews });
  }
}

export const tvController = new TvController();