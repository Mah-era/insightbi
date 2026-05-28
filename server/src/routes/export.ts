import { Router, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../utils/prisma';
import { createError } from '../middleware/errorHandler';

const router = Router();

router.use(authenticate);

router.get('/datasets/:id/export/csv', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const dataset = await prisma.dataset.findUnique({ where: { id: req.params.id } });
    if (!dataset) throw createError('Dataset not found', 404);

    const rows = await prisma.datasetRow.findMany({
      where: { datasetId: req.params.id },
      orderBy: { rowIndex: 'asc' },
      select: { rowJson: true },
    });

    const data = rows.map((r) => { try { return typeof r.rowJson === 'string' ? JSON.parse(r.rowJson) : r.rowJson; } catch { return {}; } }) as Record<string, unknown>[];
    if (!data.length) return res.status(204).send();

    const headers = Object.keys(data[0]);
    const csvLines = [
      headers.join(','),
      ...data.map((row) => headers.map((h) => JSON.stringify(row[h] ?? '')).join(',')),
    ];

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${dataset.name}.csv"`);
    res.send(csvLines.join('\n'));
  } catch (err) {
    next(err);
  }
});

router.get('/reports/:id/export/json', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const report = await prisma.report.findUnique({ where: { id: req.params.id } });
    if (!report) throw createError('Report not found', 404);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${report.name}.json"`);
    res.json({ name: report.name, layoutJson: report.layoutJson, configJson: report.configJson, exportedAt: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
});

export default router;
