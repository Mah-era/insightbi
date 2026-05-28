import { Router } from 'express';
import { listWorkspaces, createWorkspace, getWorkspace, updateWorkspace, deleteWorkspace, inviteMember } from '../controllers/workspaceController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.get('/', listWorkspaces);
router.post('/', createWorkspace);
router.get('/:id', getWorkspace);
router.put('/:id', updateWorkspace);
router.delete('/:id', deleteWorkspace);
router.post('/:id/members', inviteMember);

export default router;
