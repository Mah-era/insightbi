import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../utils/jwt';
import { createError } from './errorHandler';
import { prisma } from '../utils/prisma';

export interface AuthRequest extends Request {
  user?: JwtPayload & { id: string };
}

export async function authenticate(req: AuthRequest, _res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) throw createError('No token provided', 401);

    const token = authHeader.split(' ')[1];
    const payload = verifyToken(token);
    req.user = { ...payload, id: payload.userId };
    next();
  } catch {
    next(createError('Invalid or expired token', 401));
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(createError('Insufficient permissions', 403));
    }
    next();
  };
}

export async function requireWorkspaceAccess(req: AuthRequest, _res: Response, next: NextFunction) {
  try {
    const workspaceId = req.params.workspaceId || req.body.workspaceId;
    if (!workspaceId) return next();

    const member = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: req.user!.id } },
    });
    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });

    if (!member && workspace?.ownerId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return next(createError('Access denied to this workspace', 403));
    }
    next();
  } catch {
    next(createError('Workspace access check failed', 500));
  }
}
