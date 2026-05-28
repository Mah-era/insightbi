import { Router } from 'express';
import { prisma } from '../utils/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { hydrateActivityLog } from '../utils/json';

const router = Router();

// GET /api/activity/mine — current user's own activity
router.get('/mine', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const logs = await prisma.activityLog.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { workspace: { select: { id: true, name: true } } },
    });
    res.json({
      success: true,
      data: logs.map((l) => hydrateActivityLog(l as unknown as Record<string, unknown>)),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
