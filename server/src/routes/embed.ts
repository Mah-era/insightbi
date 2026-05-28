import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { createEmbedToken, getEmbedReport, getEmbedData } from '../controllers/embedController';

const router = Router();

// Public embed endpoints (no auth)
router.get('/embed/reports/:token', getEmbedReport);
router.get('/embed/reports/:token/data', getEmbedData);

// Auth-protected: create token
router.post('/reports/:id/embed-token', authenticate, createEmbedToken);

export default router;
