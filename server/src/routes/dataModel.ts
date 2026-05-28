import { Router } from 'express';
import { getDataModel, createRelationship, deleteRelationship } from '../controllers/dataModelController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.get('/', getDataModel);
router.post('/relationships', createRelationship);
router.delete('/relationships/:id', deleteRelationship);

export default router;
