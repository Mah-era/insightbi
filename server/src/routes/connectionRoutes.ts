import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  listConnections, testConnectionHandler, createConnection, updateConnection,
  deleteConnection, getSchema, importTableHandler, queryPreview,
} from '../controllers/connectionController';

const router = Router();
router.use(authenticate);

router.get('/', listConnections);
router.post('/test', testConnectionHandler);
router.post('/', createConnection);
router.put('/:id', updateConnection);
router.delete('/:id', deleteConnection);
router.get('/:id/schema', getSchema);
router.post('/:id/import-table', importTableHandler);
router.post('/:id/query-preview', queryPreview);

export default router;
