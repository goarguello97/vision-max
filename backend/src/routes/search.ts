/**
 * @fileoverview Router de búsqueda unificada
 * @module routes/search
 */

import { Router } from 'express';
import { searchController } from '../controllers/SearchController';

const router = Router();

router.get('/all', searchController.searchAll);

export default router;