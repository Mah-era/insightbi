import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { listMeasures, createMeasure, updateMeasure, deleteMeasure, validateMeasure, previewMeasure } from '../controllers/measureController';

const router = Router();
router.use(authenticate);

router.get('/', listMeasures);
router.post('/', createMeasure);
router.put('/:id', updateMeasure);
router.delete('/:id', deleteMeasure);
router.post('/validate', validateMeasure);
router.post('/preview', previewMeasure);

export default router;
