import { Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { createError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { logActivity } from '../services/activityService';

export async function listWorkspaces(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    // Every user (including admin) only sees their own workspaces in the main app.
    // Admin can view ALL workspaces through the dedicated /api/admin/workspaces endpoint.
    const memberships = await prisma.workspaceMember.findMany({
      where: { userId: req.user!.id },
      include: {
        workspace: {
          include: {
            owner: { select: { id: true, name: true, email: true } },
            _count: { select: { datasets: true, reports: true, members: true } },
          },
        },
      },
    });
    const workspaces = memberships.map((m) => ({ ...m.workspace, memberRole: m.role }));
    res.json({ success: true, data: workspaces });
  } catch (err) {
    next(err);
  }
}

export async function createWorkspace(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { name, description } = req.body;
    if (!name) throw createError('Workspace name is required', 400);

    const workspace = await prisma.workspace.create({
      data: {
        name,
        description,
        ownerId: req.user!.id,
        members: { create: { userId: req.user!.id, role: 'OWNER' } },
      },
      include: { owner: { select: { id: true, name: true, email: true } }, _count: { select: { datasets: true, reports: true, members: true } } },
    });

    await logActivity(req.user!.id, workspace.id, 'WORKSPACE_CREATED', { name });
    res.status(201).json({ success: true, data: workspace });
  } catch (err) {
    next(err);
  }
}

export async function getWorkspace(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const workspace = await prisma.workspace.findUnique({
      where: { id: req.params.id },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        members: { include: { user: { select: { id: true, name: true, email: true, role: true, avatarUrl: true } } } },
        _count: { select: { datasets: true, reports: true } },
      },
    });
    if (!workspace) throw createError('Workspace not found', 404);
    res.json({ success: true, data: workspace });
  } catch (err) {
    next(err);
  }
}

export async function updateWorkspace(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { name, description } = req.body;
    const workspace = await prisma.workspace.findUnique({ where: { id: req.params.id } });
    if (!workspace) throw createError('Workspace not found', 404);
    if (workspace.ownerId !== req.user!.id) {
      throw createError('Only the workspace owner can update it', 403);
    }

    const updated = await prisma.workspace.update({
      where: { id: req.params.id },
      data: { ...(name && { name }), ...(description !== undefined && { description }) },
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

export async function deleteWorkspace(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const workspace = await prisma.workspace.findUnique({ where: { id: req.params.id } });
    if (!workspace) throw createError('Workspace not found', 404);
    if (workspace.ownerId !== req.user!.id) {
      throw createError('Only the workspace owner can delete it', 403);
    }

    await prisma.workspace.delete({ where: { id: req.params.id } });
    await logActivity(req.user!.id, null, 'WORKSPACE_DELETED', { name: workspace.name });
    res.json({ success: true, message: 'Workspace deleted' });
  } catch (err) {
    next(err);
  }
}

export async function inviteMember(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { email, role = 'VIEWER' } = req.body;
    const workspaceId = req.params.id;

    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) throw createError('Workspace not found', 404);

    const targetUser = await prisma.user.findUnique({ where: { email } });
    if (!targetUser) throw createError('User with this email not found', 404);

    const existing = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: targetUser.id } },
    });
    if (existing) throw createError('User is already a member', 409);

    const member = await prisma.workspaceMember.create({
      data: { workspaceId, userId: targetUser.id, role },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    await logActivity(req.user!.id, workspaceId, 'MEMBER_INVITED', { email, role });
    res.status(201).json({ success: true, data: member });
  } catch (err) {
    next(err);
  }
}
