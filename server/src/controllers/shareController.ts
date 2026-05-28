import { Response, NextFunction, Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../utils/prisma';
import { createError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { logActivity } from '../services/activityService';
import { parseJson } from '../utils/json';

export async function shareReport(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { email, permission = 'VIEW' } = req.body;
    const reportId = req.params.id;

    const report = await prisma.report.findUnique({ where: { id: reportId } });
    if (!report) throw createError('Report not found', 404);

    if (email) {
      const targetUser = await prisma.user.findUnique({ where: { email } });
      if (!targetUser) throw createError('User not found', 404);

      const share = await prisma.reportShare.upsert({
        where: { reportId_userId: { reportId, userId: targetUser.id } },
        create: { reportId, userId: targetUser.id, permission: permission as string },
        update: { permission: permission as string },
        include: { user: { select: { id: true, name: true, email: true } } },
      });

      await logActivity(req.user!.id, report.workspaceId, 'REPORT_SHARED', { email, permission });
      return res.json({ success: true, data: share });
    }

    // Create public share link
    const link = await prisma.shareLink.create({
      data: { reportId, token: uuidv4(), permission: permission as string },
    });

    await logActivity(req.user!.id, report.workspaceId, 'SHARE_LINK_CREATED', { permission });
    res.status(201).json({ success: true, data: link });
  } catch (err) {
    next(err);
  }
}

export async function getSharedReports(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const shares = await prisma.reportShare.findMany({
      where: { userId: req.user!.id },
      include: { report: { include: { createdBy: { select: { id: true, name: true, email: true } } } } },
    });
    res.json({ success: true, data: shares });
  } catch (err) {
    next(err);
  }
}

export async function getPublicReport(req: Request, res: Response, next: NextFunction) {
  try {
    const { token } = req.params;

    const link = await prisma.shareLink.findUnique({
      where: { token },
      include: { report: true },
    });

    if (!link || !link.isActive) throw createError('Share link not found or has been disabled', 404);

    if (link.expiresAt && link.expiresAt < new Date()) {
      await prisma.shareLink.update({ where: { id: link.id }, data: { isActive: false } });
      throw createError('Share link has expired', 410);
    }

    const r = link.report;

    // Parse JSON string fields before sending — SQLite stores them as strings
    const safeReport = {
      id: r.id,
      name: r.name,
      description: r.description,
      layoutJson: parseJson<{ widgets: unknown[] }>(r.layoutJson, { widgets: [] }),
      configJson: parseJson<Record<string, unknown>>(r.configJson, {}),
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };

    res.json({ success: true, data: { report: safeReport, permission: link.permission } });
  } catch (err) {
    next(err);
  }
}

/**
 * Serve chart data for a public share link — no authentication required.
 * Validates the token, verifies the requested dataset belongs to the same
 * workspace as the shared report, then proxies to getDatasetRows.
 */
export async function getPublicReportData(req: Request, res: Response, next: NextFunction) {
  try {
    const { token } = req.params;
    const { datasetId, ...queryRest } = req.query as Record<string, string>;

    if (!datasetId) throw createError('datasetId query param is required', 400);

    const link = await prisma.shareLink.findUnique({ where: { token } });
    if (!link || !link.isActive) throw createError('Share link not found or has been disabled', 404);
    if (link.expiresAt && link.expiresAt < new Date()) throw createError('Share link has expired', 410);

    // Verify the dataset belongs to the same workspace as the shared report
    const report = await prisma.report.findUnique({ where: { id: link.reportId } });
    if (!report) throw createError('Report not found', 404);

    const dataset = await prisma.dataset.findFirst({
      where: { id: datasetId, workspaceId: report.workspaceId },
    });
    if (!dataset) throw createError('Dataset not found or not authorized', 403);

    // Delegate to the real rows handler by mutating req
    req.params = { ...req.params, id: datasetId };
    req.query = queryRest as typeof req.query;

    const { getDatasetRows } = await import('./datasetController');
    return getDatasetRows(req as unknown as AuthRequest, res, next);
  } catch (err) {
    next(err);
  }
}

export async function disableShareLink(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const link = await prisma.shareLink.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    res.json({ success: true, data: link });
  } catch (err) {
    next(err);
  }
}
