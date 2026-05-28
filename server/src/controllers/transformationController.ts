import { Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { createError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { applyTransformationSteps, inferSchema, TransformStep } from '../services/datasetService';
import { logActivity } from '../services/activityService';
import { stringifyJson, hydrateTransformation } from '../utils/json';
import { createOrUpdateQueryTable } from '../services/sqlQueryService';

export async function saveTransformation(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { steps, name } = req.body;
    const datasetId = req.params.id;

    const dataset = await prisma.dataset.findUnique({ where: { id: datasetId } });
    if (!dataset) throw createError('Dataset not found', 404);

    const existing = await prisma.transformation.findFirst({ where: { datasetId } });

    const transformation = existing
      ? await prisma.transformation.update({ where: { id: existing.id }, data: { stepsJson: stringifyJson(steps), name: name || 'Transformation' } })
      : await prisma.transformation.create({ data: { datasetId, stepsJson: stringifyJson(steps), name: name || 'Transformation' } });

    await logActivity(req.user!.id, dataset.workspaceId, 'TRANSFORMATION_SAVED', { datasetId, stepCount: steps.length });
    res.json({ success: true, data: hydrateTransformation(transformation as unknown as Record<string, unknown>) });
  } catch (err) {
    next(err);
  }
}

export async function getTransformations(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const transformations = await prisma.transformation.findMany({
      where: { datasetId: req.params.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: transformations.map((t) => hydrateTransformation(t as unknown as Record<string, unknown>)) });
  } catch (err) {
    next(err);
  }
}

export async function previewTransformation(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { steps } = req.body as { steps: TransformStep[] };
    const datasetId = req.params.id;

    const rawRows = await prisma.datasetRow.findMany({
      where: { datasetId },
      orderBy: { rowIndex: 'asc' },
      take: 200,
      select: { rowJson: true },
    });

    const rows = rawRows.map((r) => {
      try { return typeof r.rowJson === 'string' ? JSON.parse(r.rowJson) : r.rowJson; } catch { return {}; }
    }) as Record<string, unknown>[];

    const transformed = applyTransformationSteps(rows, steps);
    const schema = inferSchema(transformed);

    res.json({ success: true, data: { rows: transformed.slice(0, 100), schema, rowCount: transformed.length } });
  } catch (err) {
    next(err);
  }
}

export async function applyTransformation(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { steps } = req.body as { steps: TransformStep[] };
    const datasetId = req.params.id;

    const dataset = await prisma.dataset.findUnique({ where: { id: datasetId } });
    if (!dataset) throw createError('Dataset not found', 404);

    const rawRows = await prisma.datasetRow.findMany({
      where: { datasetId },
      orderBy: { rowIndex: 'asc' },
      select: { rowJson: true },
    });

    const rows = rawRows.map((r) => {
      try { return typeof r.rowJson === 'string' ? JSON.parse(r.rowJson) : r.rowJson; } catch { return {}; }
    }) as Record<string, unknown>[];

    const transformed = applyTransformationSteps(rows, steps);
    const newSchema = inferSchema(transformed);

    await prisma.datasetRow.deleteMany({ where: { datasetId } });
    const BATCH = 500;
    for (let i = 0; i < transformed.length; i += BATCH) {
      await prisma.datasetRow.createMany({
        data: transformed.slice(i, i + BATCH).map((rowJson, idx) => ({
          datasetId,
          rowIndex: i + idx,
          rowJson: stringifyJson(rowJson),
        })),
      });
    }

    await prisma.dataset.update({
      where: { id: datasetId },
      data: { rowCount: transformed.length, columnCount: newSchema.length, schemaJson: stringifyJson(newSchema) },
    });

    await prisma.transformation.create({ data: { datasetId, stepsJson: stringifyJson(steps) } });

    // Rebuild SQL query table in background
    createOrUpdateQueryTable(datasetId, transformed, newSchema).catch(() => {});

    await logActivity(req.user!.id, dataset.workspaceId, 'TRANSFORMATION_APPLIED', { datasetId, stepCount: steps.length });

    res.json({ success: true, data: { rowCount: transformed.length, columnCount: newSchema.length, schema: newSchema } });
  } catch (err) {
    next(err);
  }
}
