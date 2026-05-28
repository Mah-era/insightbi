import { Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { createError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { parseJson } from '../utils/json';

export async function getDataModel(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { workspaceId } = req.query;
    if (!workspaceId) throw createError('workspaceId required', 400);

    const [datasets, relationships] = await Promise.all([
      prisma.dataset.findMany({
        where: { workspaceId: String(workspaceId) },
        select: { id: true, name: true, schemaJson: true, rowCount: true, columnCount: true },
      }),
      prisma.dataRelationship.findMany({
        where: { sourceDataset: { workspaceId: String(workspaceId) } },
        include: {
          sourceDataset: { select: { id: true, name: true } },
          targetDataset: { select: { id: true, name: true } },
        },
      }),
    ]);

    const hydratedDatasets = datasets.map((ds) => ({
      ...ds,
      schemaJson: parseJson(ds.schemaJson as unknown as string, []),
    }));

    res.json({ success: true, data: { datasets: hydratedDatasets, relationships } });
  } catch (err) {
    next(err);
  }
}

export async function createRelationship(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { sourceDatasetId, targetDatasetId, sourceColumn, targetColumn, relationshipType } = req.body;

    const rel = await prisma.dataRelationship.create({
      data: { sourceDatasetId, targetDatasetId, sourceColumn, targetColumn, relationshipType },
      include: {
        sourceDataset: { select: { id: true, name: true } },
        targetDataset: { select: { id: true, name: true } },
      },
    });

    res.status(201).json({ success: true, data: rel });
  } catch (err) {
    next(err);
  }
}

export async function deleteRelationship(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await prisma.dataRelationship.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Relationship deleted' });
  } catch (err) {
    next(err);
  }
}
