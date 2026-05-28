import { Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { createError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { parseJson, stringifyJson } from '../utils/json';
import { testConnection, getConnectionSchema, importTable } from '../services/connectionService';

function maskConnection(conn: Record<string, unknown>) {
  const { encryptedSecretJson: _, ...safe } = conn;
  return { ...safe, configJson: parseJson(conn.configJson, {}) };
}

export async function listConnections(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { workspaceId } = req.query;
    if (!workspaceId) throw createError('workspaceId is required', 400);
    const conns = await prisma.dataConnection.findMany({ where: { workspaceId: String(workspaceId) } });
    res.json({ success: true, data: conns.map((c) => maskConnection(c as unknown as Record<string, unknown>)) });
  } catch (err) { next(err); }
}

export async function testConnectionHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { type, host, port, database, username, password, ssl, url } = req.body;
    const result = await testConnection({ type, host, port, database, username, password, ssl, url });
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

export async function createConnection(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { workspaceId, name, type, config, password, mode } = req.body;
    if (!workspaceId || !name || !type) throw createError('workspaceId, name, type required', 400);

    const conn = await prisma.dataConnection.create({
      data: {
        workspaceId,
        name,
        type,
        configJson: stringifyJson(config || {}),
        encryptedSecretJson: stringifyJson({ password: password || '' }),
        mode: mode || 'IMPORT',
        createdById: req.user!.id,
      },
    });
    res.status(201).json({ success: true, data: maskConnection(conn as unknown as Record<string, unknown>) });
  } catch (err) { next(err); }
}

export async function updateConnection(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const conn = await prisma.dataConnection.findUnique({ where: { id: req.params.id } });
    if (!conn) throw createError('Connection not found', 404);

    const { name, config, password, mode } = req.body;
    const updated = await prisma.dataConnection.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(config && { configJson: stringifyJson(config) }),
        ...(password !== undefined && { encryptedSecretJson: stringifyJson({ password }) }),
        ...(mode && { mode }),
      },
    });
    res.json({ success: true, data: maskConnection(updated as unknown as Record<string, unknown>) });
  } catch (err) { next(err); }
}

export async function deleteConnection(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const conn = await prisma.dataConnection.findUnique({ where: { id: req.params.id } });
    if (!conn) throw createError('Connection not found', 404);
    await prisma.dataConnection.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Connection deleted' });
  } catch (err) { next(err); }
}

export async function getSchema(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const conn = await prisma.dataConnection.findUnique({ where: { id: req.params.id } });
    if (!conn) throw createError('Connection not found', 404);
    const schema = await getConnectionSchema(conn as unknown as { type: string; configJson: string });
    res.json({ success: true, data: schema });
  } catch (err) { next(err); }
}

export async function importTableHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const conn = await prisma.dataConnection.findUnique({ where: { id: req.params.id } });
    if (!conn) throw createError('Connection not found', 404);

    const { tableName, workspaceId } = req.body;
    if (!tableName || !workspaceId) throw createError('tableName and workspaceId required', 400);

    const result = await importTable(
      conn as unknown as { id: string; type: string; configJson: string },
      tableName,
      workspaceId,
      req.user!.id
    );
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

export async function queryPreview(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const conn = await prisma.dataConnection.findUnique({ where: { id: req.params.id } });
    if (!conn) throw createError('Connection not found', 404);
    const schema = await getConnectionSchema(conn as unknown as { type: string; configJson: string });
    res.json({ success: true, data: schema });
  } catch (err) { next(err); }
}
