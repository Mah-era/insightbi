import { Router } from 'express';
import { listReports, createReport, getReport, updateReport, deleteReport, duplicateReport, exportReportJson } from '../controllers/reportController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.get('/', listReports);
router.post('/', createReport);
router.get('/:id/export/json', exportReportJson);
router.get('/:id', getReport);
router.put('/:id', updateReport);
router.delete('/:id', deleteReport);
router.post('/:id/duplicate', duplicateReport);

export default router;
