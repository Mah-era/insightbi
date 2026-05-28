import { Router } from 'express';
import { uploadDataset, listDatasets, getDataset, getDatasetPreview, deleteDataset, getDatasetRows } from '../controllers/datasetController';
import { authenticate } from '../middleware/auth';
import { uploadMiddleware } from '../middleware/upload';

const router = Router();

router.use(authenticate);
router.post('/upload', uploadMiddleware.single('file'), uploadDataset);
router.get('/', listDatasets);
router.get('/:id', getDataset);
router.get('/:id/preview', getDatasetPreview);
router.get('/:id/rows', getDatasetRows);
router.delete('/:id', deleteDataset);

export default router;
