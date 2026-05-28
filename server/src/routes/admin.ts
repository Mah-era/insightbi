import { Router } from 'express';
import { getAdminStats, getAdminUsers, getActivityLogs, updateUserRole, getAdminWorkspaces, getAdminReports, getAdminDatasets } from '../controllers/adminController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.get('/stats', getAdminStats);
router.get('/users', getAdminUsers);
router.put('/users/:id/role', updateUserRole);
router.get('/activity', getActivityLogs);
router.get('/workspaces', getAdminWorkspaces);
router.get('/reports', getAdminReports);
router.get('/datasets', getAdminDatasets);

export default router;
