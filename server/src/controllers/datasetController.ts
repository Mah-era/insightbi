import { Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { createError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { parseFile, inferSchema } from '../services/datasetService';
import { logActivity } from '../services/activityService';
import { cacheGet, cacheSet, cacheDel } from '../utils/redis';
import { hydrateDataset, stringifyJson, parseJson } from '../utils/json';
import { createOrUpdateQueryTable, dropQueryTable, queryTable } from '../services/sqlQueryService';
import fs from 'fs';

export async function uploadDataset(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.file) throw createError('No file uploaded', 400);
    const { workspaceId, name } = req.body;
    if (!workspaceId) throw createError('workspaceId is required', 400);

    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) throw createError('Workspace not found', 404);

    const rows = parseFile(req.file.path, req.file.mimetype);
    const schema = inferSchema(rows);

    const dataset = await prisma.dataset.create({
      data: {
        workspaceId,
        name: name || req.file.originalname.replace(/\.[^.]+$/, ''),
        fileName: req.file.originalname,
        fileType: req.file.mimetype,
        filePath: req.file.path,
        rowCount: rows.length,
        columnCount: schema.length,
        schemaJson: stringifyJson(schema),
      },
    });

    const BATCH = 500;
    for (let i = 0; i < rows.length; i += BATCH) {
      await prisma.datasetRow.createMany({
        data: rows.slice(i, i + BATCH).map((rowJson, idx) => ({
          datasetId: dataset.id,
          rowIndex: i + idx,
          rowJson: stringifyJson(rowJson),
        })),
      });
    }

    // Build SQL query table in background (non-blocking)
    createOrUpdateQueryTable(dataset.id, rows, schema).catch(() => {});

    await logActivity(req.user!.id, workspaceId, 'DATASET_UPLOADED', { name: dataset.name, rowCount: rows.length });
    res.status(201).json({ success: true, data: hydrateDataset(dataset as unknown as Record<string, unknown>) });
  } catch (err) {
    next(err);
  }
}

export async function listDatasets(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { workspaceId } = req.query;
    const datasets = await prisma.dataset.findMany({
      where: workspaceId ? { workspaceId: String(workspaceId) } : undefined,
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: datasets.map((d) => hydrateDataset(d as unknown as Record<string, unknown>)) });
  } catch (err) {
    next(err);
  }
}

export async function getDataset(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const cacheKey = `dataset:${req.params.id}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return res.json({ success: true, data: JSON.parse(cached), cached: true });

    const dataset = await prisma.dataset.findUnique({ where: { id: req.params.id } });
    if (!dataset) throw createError('Dataset not found', 404);

    const hydrated = hydrateDataset(dataset as unknown as Record<string, unknown>);
    await cacheSet(cacheKey, JSON.stringify(hydrated), 60);
    res.json({ success: true, data: hydrated });
  } catch (err) {
    next(err);
  }
}

export async function getDatasetPreview(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 50);
    const skip = (page - 1) * limit;

    const dataset = await prisma.dataset.findUnique({ where: { id: req.params.id } });
    if (!dataset) throw createError('Dataset not found', 404);

    const rows = await prisma.datasetRow.findMany({
      where: { datasetId: req.params.id },
      orderBy: { rowIndex: 'asc' },
      skip,
      take: limit,
      select: { rowJson: true, rowIndex: true },
    });

    const parsedRows = rows.map((r) => {
      try { return typeof r.rowJson === 'string' ? JSON.parse(r.rowJson) : r.rowJson; } catch { return {}; }
    });

    res.json({
      success: true,
      data: {
        rows: parsedRows,
        schema: typeof dataset.schemaJson === 'string' ? JSON.parse(dataset.schemaJson) : dataset.schemaJson,
        pagination: { page, limit, total: dataset.rowCount, pages: Math.ceil(dataset.rowCount / limit) },
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteDataset(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const dataset = await prisma.dataset.findUnique({ where: { id: req.params.id }, include: { workspace: { select: { ownerId: true } } } });
    if (!dataset) throw createError('Dataset not found', 404);
    if (dataset.workspace?.ownerId !== req.user!.id) {
      throw createError('Only the workspace owner can delete datasets', 403);
    }

    if (fs.existsSync(dataset.filePath)) fs.unlinkSync(dataset.filePath);

    await dropQueryTable(req.params.id);
    await prisma.dataset.delete({ where: { id: req.params.id } });
    await cacheDel(`dataset:${req.params.id}`);
    await logActivity(req.user!.id, dataset.workspaceId, 'DATASET_DELETED', { name: dataset.name });

    res.json({ success: true, message: 'Dataset deleted' });
  } catch (err) {
    next(err);
  }
}

export async function getDatasetRows(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { groupBy, valueField, aggregation, filters, sortBy, sortOrder, limit } = req.query;
    const parsedFilters = filters ? parseJson(filters as string, []) : [];
    const limitNum = limit ? Math.min(Number(limit), 10000) : undefined;

    if (groupBy || aggregation) {
      // Try SQL engine first
      try {
        const sqlResult = await queryTable(req.params.id, {
          groupBy: groupBy as string,
          valueField: valueField as string,
          aggregation: aggregation as 'sum' | 'avg' | 'count' | 'min' | 'max',
          filters: parsedFilters,
          sortBy: sortBy as string,
          sortOrder: (sortOrder as 'asc' | 'desc') || 'desc',
          limit: limitNum,
        });
        if (sqlResult) {
          return res.json({ success: true, data: sqlResult.data, meta: sqlResult.meta });
        }
      } catch {
        // fallthrough to in-memory
      }

      // In-memory fallback
      const dbRows = await prisma.datasetRow.findMany({
        where: { datasetId: req.params.id },
        orderBy: { rowIndex: 'asc' },
        select: { rowJson: true },
      });
      const rawRows = dbRows.map((r) => {
        try { return typeof r.rowJson === 'string' ? JSON.parse(r.rowJson) : r.rowJson; } catch { return {}; }
      }) as Record<string, unknown>[];

      const { aggregateData } = await import('../utils/dataAggregator');
      const result = aggregateData({
        rows: rawRows,
        groupBy: groupBy as string,
        valueField: valueField as string,
        aggregation: aggregation as 'sum' | 'avg' | 'count' | 'min' | 'max',
        filters: parsedFilters,
        sortBy: sortBy as string,
        sortOrder: (sortOrder as 'asc' | 'desc') || 'desc',
        limit: limitNum,
      });
      return res.json({ success: true, data: result, meta: { engine: 'memory', cached: false } });
    }

    const dbRows = await prisma.datasetRow.findMany({
      where: { datasetId: req.params.id },
      orderBy: { rowIndex: 'asc' },
      take: limitNum || 10000,
      select: { rowJson: true },
    });

    const rawRows = dbRows.map((r) => {
      try { return typeof r.rowJson === 'string' ? JSON.parse(r.rowJson) : r.rowJson; } catch { return {}; }
    }) as Record<string, unknown>[];

    res.json({ success: true, data: rawRows });
  } catch (err) {
    next(err);
  }
}
