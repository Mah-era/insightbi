import { Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { createError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { parseExpression, evaluateExpression, validateExpression } from '../services/formulaService';
import { parseJson } from '../utils/json';

export async function listMeasures(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { workspaceId } = req.query;
    if (!workspaceId) throw createError('workspaceId is required', 400);
    const measures = await prisma.measure.findMany({ where: { workspaceId: String(workspaceId) } });
    res.json({ success: true, data: measures });
  } catch (err) { next(err); }
}

export async function createMeasure(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { workspaceId, name, expression, format, datasetId, description } = req.body;
    if (!workspaceId || !name || !expression) throw createError('workspaceId, name and expression required', 400);

    // Validate expression
    const validation = validateExpression(expression, []);
    // Allow valid syntax even without schema — we just check parse
    try { parseExpression(expression); } catch (e) {
      throw createError(`Invalid expression: ${(e as Error).message}`, 400);
    }

    const measure = await prisma.measure.create({
      data: { workspaceId, name, expression, format: format || 'number', datasetId: datasetId || null, description, createdById: req.user!.id },
    });
    res.status(201).json({ success: true, data: measure });
  } catch (err) { next(err); }
}

export async function updateMeasure(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { name, expression, format, datasetId, description } = req.body;
    const measure = await prisma.measure.findUnique({ where: { id: req.params.id } });
    if (!measure) throw createError('Measure not found', 404);

    if (expression) {
      try { parseExpression(expression); } catch (e) {
        throw createError(`Invalid expression: ${(e as Error).message}`, 400);
      }
    }

    const updated = await prisma.measure.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(expression && { expression }),
        ...(format && { format }),
        ...(datasetId !== undefined && { datasetId: datasetId || null }),
        ...(description !== undefined && { description }),
      },
    });
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
}

export async function deleteMeasure(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const measure = await prisma.measure.findUnique({ where: { id: req.params.id } });
    if (!measure) throw createError('Measure not found', 404);
    await prisma.measure.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Measure deleted' });
  } catch (err) { next(err); }
}

export async function validateMeasure(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { expression, datasetId } = req.body;
    if (!expression) throw createError('expression is required', 400);

    let schema: Array<{ name: string; type: string }> = [];
    if (datasetId) {
      const ds = await prisma.dataset.findUnique({ where: { id: datasetId } });
      if (ds) schema = parseJson(ds.schemaJson, []);
    }

    const result = validateExpression(expression, schema);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

export async function previewMeasure(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { expression, datasetId } = req.body;
    if (!expression || !datasetId) throw createError('expression and datasetId required', 400);

    let ast;
    try { ast = parseExpression(expression); } catch (e) {
      throw createError(`Invalid expression: ${(e as Error).message}`, 400);
    }

    const dbRows = await prisma.datasetRow.findMany({
      where: { datasetId },
      orderBy: { rowIndex: 'asc' },
      take: 1000,
      select: { rowJson: true },
    });
    const rows = dbRows.map((r) => {
      try { return typeof r.rowJson === 'string' ? JSON.parse(r.rowJson) : r.rowJson; } catch { return {}; }
    }) as Record<string, unknown>[];

    const result = evaluateExpression(ast, rows);
    res.json({ success: true, data: { result, rowCount: rows.length } });
  } catch (err) { next(err); }
}
