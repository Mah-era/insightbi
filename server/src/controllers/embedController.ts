import { Response, NextFunction, Request } from 'express';
import { prisma } from '../utils/prisma';
import { createError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { hydrateReport, parseJson } from '../utils/json';

export async function createEmbedToken(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { expiresAt, allowedOrigin } = req.body;
    const report = await prisma.report.findUnique({ where: { id: req.params.id } });
    if (!report) throw createError('Report not found', 404);

    const token = await prisma.embedToken.create({
      data: {
        reportId: req.params.id,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        allowedOrigin: allowedOrigin || null,
        createdById: req.user!.id,
      },
    });
    res.status(201).json({ success: true, data: token });
  } catch (err) { next(err); }
}

export async function getEmbedReport(req: Request, res: Response, next: NextFunction) {
  try {
    const tokenRecord = await prisma.embedToken.findUnique({
      where: { token: req.params.token },
      include: { report: true },
    });

    if (!tokenRecord || tokenRecord.revokedAt) throw createError('Embed token not found or revoked', 404);
    if (tokenRecord.expiresAt && tokenRecord.expiresAt < new Date()) throw createError('Embed token has expired', 410);

    const report = tokenRecord.report;
    const safeReport = {
      id: report.id,
      name: report.name,
      description: report.description,
      layoutJson: parseJson(report.layoutJson, { widgets: [] }),
      configJson: parseJson(report.configJson, {}),
      createdAt: report.createdAt,
    };

    res.json({ success: true, data: { report: safeReport, allowedOrigin: tokenRecord.allowedOrigin } });
  } catch (err) { next(err); }
}

export async function getEmbedData(req: Request, res: Response, next: NextFunction) {
  try {
    const tokenRecord = await prisma.embedToken.findUnique({ where: { token: req.params.token } });
    if (!tokenRecord || tokenRecord.revokedAt) throw createError('Embed token not found or revoked', 404);
    if (tokenRecord.expiresAt && tokenRecord.expiresAt < new Date()) throw createError('Embed token has expired', 410);

    // Delegate to dataset rows logic
    const { datasetId, ...params } = req.query;
    if (!datasetId) throw createError('datasetId is required', 400);

    const { getDatasetRows } = await import('./datasetController');
    (req as unknown as AuthRequest).params = { ...(req as unknown as AuthRequest).params, id: String(datasetId) };
    return getDatasetRows(req as unknown as AuthRequest, res, next);
  } catch (err) { next(err); }
}
