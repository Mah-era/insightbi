import { Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { createError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { logActivity } from '../services/activityService';
import { cacheDel } from '../utils/redis';
import { hydrateReport, stringifyJson } from '../utils/json';

export async function listReports(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { workspaceId } = req.query;
    const reports = await prisma.report.findMany({
      where: workspaceId ? { workspaceId: String(workspaceId) } : undefined,
      include: { createdBy: { select: { id: true, name: true, email: true } } },
      orderBy: { updatedAt: 'desc' },
    });
    res.json({ success: true, data: reports.map((r) => hydrateReport(r as unknown as Record<string, unknown>)) });
  } catch (err) {
    next(err);
  }
}

export async function createReport(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { workspaceId, name, description, layoutJson, configJson } = req.body;
    if (!workspaceId || !name) throw createError('workspaceId and name are required', 400);

    const report = await prisma.report.create({
      data: {
        workspaceId,
        name,
        description,
        layoutJson: stringifyJson(layoutJson || { widgets: [] }),
        configJson: stringifyJson(configJson || { theme: 'light', refreshInterval: 0, globalFilters: [] }),
        createdById: req.user!.id,
      },
      include: { createdBy: { select: { id: true, name: true, email: true } } },
    });

    await logActivity(req.user!.id, workspaceId, 'REPORT_CREATED', { name });
    res.status(201).json({ success: true, data: hydrateReport(report as unknown as Record<string, unknown>) });
  } catch (err) {
    next(err);
  }
}

export async function getReport(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const report = await prisma.report.findUnique({
      where: { id: req.params.id },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        shareLinks: { where: { isActive: true } },
      },
    });
    if (!report) throw createError('Report not found', 404);
    res.json({ success: true, data: hydrateReport(report as unknown as Record<string, unknown>) });
  } catch (err) {
    next(err);
  }
}

export async function updateReport(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { name, description, layoutJson, configJson, thumbnail } = req.body;
    const report = await prisma.report.findUnique({ where: { id: req.params.id }, include: { workspace: { select: { ownerId: true } } } });
    if (!report) throw createError('Report not found', 404);
    if (report.createdById !== req.user!.id && report.workspace?.ownerId !== req.user!.id) {
      throw createError('You do not have permission to edit this report', 403);
    }

    const updated = await prisma.report.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(layoutJson !== undefined && { layoutJson: stringifyJson(layoutJson) }),
        ...(configJson !== undefined && { configJson: stringifyJson(configJson) }),
        ...(thumbnail !== undefined && { thumbnail }),
      },
    });

    await cacheDel(`report:${req.params.id}`);
    await logActivity(req.user!.id, report.workspaceId, 'REPORT_UPDATED', { name: updated.name });
    res.json({ success: true, data: hydrateReport(updated as unknown as Record<string, unknown>) });
  } catch (err) {
    next(err);
  }
}

export async function deleteReport(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const report = await prisma.report.findUnique({ where: { id: req.params.id }, include: { workspace: { select: { ownerId: true } } } });
    if (!report) throw createError('Report not found', 404);
    if (report.createdById !== req.user!.id && report.workspace?.ownerId !== req.user!.id) {
      throw createError('You do not have permission to delete this report', 403);
    }

    await prisma.report.delete({ where: { id: req.params.id } });
    await cacheDel(`report:${req.params.id}`);
    await logActivity(req.user!.id, report.workspaceId, 'REPORT_DELETED', { name: report.name });
    res.json({ success: true, message: 'Report deleted' });
  } catch (err) {
    next(err);
  }
}

export async function exportReportJson(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const report = await prisma.report.findUnique({ where: { id: req.params.id } });
    if (!report) throw createError('Report not found', 404);
    const payload = hydrateReport(report as unknown as Record<string, unknown>);
    const json = JSON.stringify(payload, null, 2);
    const safeName = (report.name || 'report').replace(/[^a-z0-9_\-\s]/gi, '_');
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}.json"`);
    res.send(json);
  } catch (err) {
    next(err);
  }
}

export async function duplicateReport(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const source = await prisma.report.findUnique({ where: { id: req.params.id } });
    if (!source) throw createError('Report not found', 404);

    const copy = await prisma.report.create({
      data: {
        workspaceId: source.workspaceId,
        name: `${source.name} (Copy)`,
        description: source.description || undefined,
        layoutJson: source.layoutJson,
        configJson: source.configJson,
        createdById: req.user!.id,
      },
    });

    await logActivity(req.user!.id, source.workspaceId, 'REPORT_DUPLICATED', { name: copy.name });
    res.status(201).json({ success: true, data: hydrateReport(copy as unknown as Record<string, unknown>) });
  } catch (err) {
    next(err);
  }
}
