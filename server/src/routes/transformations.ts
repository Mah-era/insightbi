import { Router } from 'express';
import { saveTransformation, getTransformations, previewTransformation, applyTransformation } from '../controllers/transformationController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.post('/:id/transform', saveTransformation);
router.post('/:id/transform/preview', previewTransformation);
router.post('/:id/transform/apply', applyTransformation);
router.get('/:id/transformations', getTransformations);

export default router;
