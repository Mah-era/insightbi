import { Router } from 'express';
import {
  shareReport,
  getSharedReports,
  getPublicReport,
  getPublicReportData,
  disableShareLink,
} from '../controllers/shareController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Public (no auth) — share-link token routes
router.get('/public/:token', getPublicReport as unknown as Parameters<typeof router.get>[1]);
router.get('/public/:token/data', getPublicReportData as unknown as Parameters<typeof router.get>[1]);

// Protected routes
router.use(authenticate);
router.post('/reports/:id/share', shareReport);
router.get('/shared', getSharedReports);
router.patch('/share/:id/disable', disableShareLink);

export default router;
