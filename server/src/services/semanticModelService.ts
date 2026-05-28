import { prisma } from '../utils/prisma';
import { parseJson } from '../utils/json';
import { aggregateData } from '../utils/dataAggregator';

export interface SemanticField {
  ref: string;          // "datasetId.columnName"
  datasetId: string;
  datasetName: string;
  columnName: string;
  displayName: string;
  type: 'text' | 'number' | 'date' | 'boolean';
  isMeasure: false;
}

export interface SemanticMeasure {
  ref: string;          // "measure.measureId"
  id: string;
  name: string;
  expression: string;
  format: string;
  datasetId: string | null;
  isMeasure: true;
}

export type SemanticItem = SemanticField | SemanticMeasure;

export interface Relationship {
  id: string;
  sourceDatasetId: string;
  targetDatasetId: string;
  sourceColumn: string;
  targetColumn: string;
  relationshipType: string;
}

export interface SemanticModel {
  workspaceId: string;
  datasets: { id: string; name: string; fields: SemanticField[] }[];
  measures: SemanticMeasure[];
  relationships: Relationship[];
}

export async function buildSemanticModel(workspaceId: string): Promise<SemanticModel> {
  const [datasets, measures, relationships] = await Promise.all([
    prisma.dataset.findMany({ where: { workspaceId } }),
    prisma.measure.findMany({ where: { workspaceId } }),
    prisma.dataRelationship.findMany({
      where: {
        OR: [
          { sourceDataset: { workspaceId } },
          { targetDataset: { workspaceId } },
        ],
      },
    }),
  ]);

  const semanticDatasets = datasets.map((ds) => {
    const schema = parseJson<Array<{ name: string; type: string }>>(ds.schemaJson, []);
    const fields: SemanticField[] = schema.map((col) => ({
      ref: `${ds.id}.${col.name}`,
      datasetId: ds.id,
      datasetName: ds.name,
      columnName: col.name,
      displayName: col.name,
      type: col.type as 'text' | 'number' | 'date' | 'boolean',
      isMeasure: false,
    }));
    return { id: ds.id, name: ds.name, fields };
  });

  const semanticMeasures: SemanticMeasure[] = measures.map((m) => ({
    ref: `measure.${m.id}`,
    id: m.id,
    name: m.name,
    expression: m.expression,
    format: m.format,
    datasetId: m.datasetId ?? null,
    isMeasure: true,
  }));

  return {
    workspaceId,
    datasets: semanticDatasets,
    measures: semanticMeasures,
    relationships: relationships.map((r) => ({
      id: r.id,
      sourceDatasetId: r.sourceDatasetId,
      targetDatasetId: r.targetDatasetId,
      sourceColumn: r.sourceColumn,
      targetColumn: r.targetColumn,
      relationshipType: r.relationshipType,
    })),
  };
}

export function resolveFieldRefs(
  refs: string[],
  model: SemanticModel
): Array<SemanticField | SemanticMeasure | null> {
  return refs.map((ref) => {
    if (ref.startsWith('measure.')) {
      return model.measures.find((m) => m.ref === ref) || null;
    }
    for (const ds of model.datasets) {
      const field = ds.fields.find((f) => f.ref === ref);
      if (field) return field;
    }
    return null;
  });
}

export function validateQuery(
  query: { fieldRefs: string[] },
  model: SemanticModel
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  for (const ref of query.fieldRefs || []) {
    const resolved = resolveFieldRefs([ref], model)[0];
    if (!resolved) errors.push(`Unknown field ref: ${ref}`);
  }
  return { valid: errors.length === 0, errors };
}

// Phase 4: Cross-dataset join query
export interface JoinQueryParams {
  fieldRefs: string[];
  groupByRef?: string;
  valueRef?: string;
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max';
  filters?: Array<{ ref: string; operator: string; value: unknown }>;
  limit?: number;
}

function findRelationshipPath(
  fromId: string,
  toId: string,
  relationships: Relationship[]
): Relationship | null {
  return relationships.find(
    (r) =>
      (r.sourceDatasetId === fromId && r.targetDatasetId === toId) ||
      (r.sourceDatasetId === toId && r.targetDatasetId === fromId)
  ) || null;
}

export async function executeJoinQuery(
  query: JoinQueryParams,
  model: SemanticModel
): Promise<{ data: Array<{ label: string; value: number; count: number }>; meta: Record<string, unknown> }> {
  const t0 = Date.now();

  // Determine which datasets are needed
  const datasetIds = new Set<string>();
  for (const ref of query.fieldRefs || []) {
    if (!ref.startsWith('measure.')) {
      const [dsId] = ref.split('.');
      datasetIds.add(dsId);
    }
  }
  if (query.groupByRef && !query.groupByRef.startsWith('measure.')) {
    datasetIds.add(query.groupByRef.split('.')[0]);
  }
  if (query.valueRef && !query.valueRef.startsWith('measure.')) {
    datasetIds.add(query.valueRef.split('.')[0]);
  }

  const dsArr = Array.from(datasetIds);

  if (dsArr.length === 0) {
    return { data: [], meta: { engine: 'memory', queryTimeMs: Date.now() - t0 } };
  }

  if (dsArr.length === 1) {
    // Single dataset — use in-memory aggregation
    const datasetId = dsArr[0];
    const groupByField = query.groupByRef?.split('.')[1];
    const valueField = query.valueRef?.split('.')[1];

    const dbRows = await prisma.datasetRow.findMany({
      where: { datasetId },
      orderBy: { rowIndex: 'asc' },
      select: { rowJson: true },
    });
    const rows = dbRows.map((r) => {
      try { return typeof r.rowJson === 'string' ? JSON.parse(r.rowJson) : r.rowJson; } catch { return {}; }
    }) as Record<string, unknown>[];

    const result = aggregateData({
      rows,
      groupBy: groupByField,
      valueField,
      aggregation: query.aggregation || 'sum',
      limit: query.limit,
    });
    return { data: result, meta: { engine: 'memory', queryTimeMs: Date.now() - t0 } };
  }

  // Multi-dataset: find relationship path
  if (dsArr.length === 2) {
    const rel = findRelationshipPath(dsArr[0], dsArr[1], model.relationships);
    if (!rel) {
      const ds0 = model.datasets.find((d) => d.id === dsArr[0])?.name || dsArr[0];
      const ds1 = model.datasets.find((d) => d.id === dsArr[1])?.name || dsArr[1];
      throw new Error(`No relationship path found between datasets ${ds0} and ${ds1}. Create a relationship in Data Model first.`);
    }

    // Load rows for both datasets
    const [rows0, rows1] = await Promise.all(
      dsArr.map(async (dsId) => {
        const dbRows = await prisma.datasetRow.findMany({
          where: { datasetId: dsId },
          orderBy: { rowIndex: 'asc' },
          select: { rowJson: true },
        });
        return dbRows.map((r) => {
          try { return typeof r.rowJson === 'string' ? JSON.parse(r.rowJson) : r.rowJson; } catch { return {}; }
        }) as Record<string, unknown>[];
      })
    );

    // Hash join
    const [leftId, rightId] = dsArr;
    const leftCol = rel.sourceDatasetId === leftId ? rel.sourceColumn : rel.targetColumn;
    const rightCol = rel.sourceDatasetId === rightId ? rel.sourceColumn : rel.targetColumn;

    const rightMap = new Map<string, Record<string, unknown>[]>();
    for (const row of rows1) {
      const key = String(row[rightCol] ?? '');
      if (!rightMap.has(key)) rightMap.set(key, []);
      rightMap.get(key)!.push(row);
    }

    const joined: Record<string, unknown>[] = [];
    for (const leftRow of rows0) {
      const key = String(leftRow[leftCol] ?? '');
      const matches = rightMap.get(key) || [];
      if (matches.length === 0) {
        joined.push({ ...leftRow });
      } else {
        for (const rightRow of matches) {
          // Prefix right columns to avoid collision
          const prefixed: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(rightRow)) {
            prefixed[`${rightId}_${k}`] = v;
          }
          joined.push({ ...leftRow, ...prefixed });
        }
      }
    }

    const groupByField = query.groupByRef?.split('.')[1];
    const valueField = query.valueRef?.split('.')[1];

    const result = aggregateData({
      rows: joined,
      groupBy: groupByField,
      valueField,
      aggregation: query.aggregation || 'sum',
      limit: query.limit,
    });
    return { data: result, meta: { engine: 'memory-join', queryTimeMs: Date.now() - t0 } };
  }

  throw new Error('Cross-dataset queries with more than 2 datasets are not yet supported.');
}
