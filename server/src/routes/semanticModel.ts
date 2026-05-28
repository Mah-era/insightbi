import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { buildSemanticModel, validateQuery, executeJoinQuery } from '../services/semanticModelService';

const router = Router();
router.use(authenticate);

router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { workspaceId } = req.query;
    if (!workspaceId) throw createError('workspaceId is required', 400);
    const model = await buildSemanticModel(String(workspaceId));
    res.json({ success: true, data: model });
  } catch (err) { next(err); }
});

router.post('/query', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { workspaceId, query } = req.body;
    if (!workspaceId || !query) throw createError('workspaceId and query are required', 400);
    const model = await buildSemanticModel(String(workspaceId));
    const result = await executeJoinQuery(query, model);
    res.json({ success: true, data: result.data, meta: result.meta });
  } catch (err) { next(err); }
});

router.post('/validate-query', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { workspaceId, query } = req.body;
    if (!workspaceId || !query) throw createError('workspaceId and query are required', 400);
    const model = await buildSemanticModel(String(workspaceId));
    const result = validateQuery(query, model);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

export default router;
