import { Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { hydrateActivityLog } from '../utils/json';

export async function getAdminStats(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (req.user!.role !== 'ADMIN') throw createError('Admin access required', 403);

    const [userCount, workspaceCount, datasetCount, reportCount, recentLogs] = await Promise.all([
      prisma.user.count(),
      prisma.workspace.count(),
      prisma.dataset.count(),
      prisma.report.count(),
      prisma.activityLog.findMany({
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, name: true, email: true } } },
      }),
    ]);

    res.json({
      success: true,
      data: {
        userCount,
        workspaceCount,
        datasetCount,
        reportCount,
        recentLogs: recentLogs.map((l) => hydrateActivityLog(l as unknown as Record<string, unknown>)),
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getAdminUsers(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (req.user!.role !== 'ADMIN') throw createError('Admin access required', 403);

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Number(req.query.limit) || 20);
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, name: true, email: true, role: true, createdAt: true,
          _count: { select: { ownedWorkspaces: true, reports: true } },
        },
      }),
      prisma.user.count(),
    ]);

    res.json({ success: true, data: { users, pagination: { page, limit, total, pages: Math.ceil(total / limit) } } });
  } catch (err) {
    next(err);
  }
}

export async function getActivityLogs(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (req.user!.role !== 'ADMIN') throw createError('Admin access required', 403);

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 50);
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
          workspace: { select: { id: true, name: true } },
        },
      }),
      prisma.activityLog.count(),
    ]);

    res.json({
      success: true,
      data: {
        logs: logs.map((l) => hydrateActivityLog(l as unknown as Record<string, unknown>)),
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function updateUserRole(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (req.user!.role !== 'ADMIN') throw createError('Admin access required', 403);
    const { role } = req.body;
    if (!['ADMIN', 'EDITOR', 'VIEWER'].includes(role)) throw createError('Invalid role', 400);

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { role },
      select: { id: true, name: true, email: true, role: true },
    });
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

export async function getAdminWorkspaces(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (req.user!.role !== 'ADMIN') throw createError('Admin access required', 403);
    const workspaces = await prisma.workspace.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        _count: { select: { datasets: true, reports: true, members: true } },
      },
    });
    res.json({ success: true, data: workspaces });
  } catch (err) {
    next(err);
  }
}

export async function getAdminReports(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (req.user!.role !== 'ADMIN') throw createError('Admin access required', 403);
    const reports = await prisma.report.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, name: true, createdAt: true, updatedAt: true,
        workspace: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });
    res.json({ success: true, data: reports });
  } catch (err) {
    next(err);
  }
}

export async function getAdminDatasets(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (req.user!.role !== 'ADMIN') throw createError('Admin access required', 403);
    const datasets = await prisma.dataset.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, name: true, rowCount: true, columnCount: true, createdAt: true,
        workspace: { select: { id: true, name: true, owner: { select: { id: true, name: true, email: true } } } },
      },
    });
    res.json({ success: true, data: datasets });
  } catch (err) {
    next(err);
  }
}
