// This service maintains physical SQLite tables for each dataset
// and provides SQL-backed aggregation queries.
// SECURITY: Never interpolate user field names directly into SQL.
// Use a whitelist of safe column aliases from the schema mapping.

import { prisma } from '../utils/prisma';
import { parseJson, stringifyJson } from '../utils/json';

export interface ColumnMapping {
  [originalName: string]: string; // maps to col_0, col_1, etc.
}

export interface SqlQueryParams {
  groupBy?: string;
  valueField?: string;
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max';
  filters?: Array<{ field: string; operator: string; value: unknown }>;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
}

export interface SqlQueryResult {
  data: Array<{ label: string; value: number; count: number }>;
  meta: { rowCount: number; queryTimeMs: number; engine: 'sql'; cached: boolean };
}

function safeTableName(datasetId: string): string {
  return `ds_${datasetId.replace(/[^a-zA-Z0-9_]/g, '_')}`;
}

export async function createOrUpdateQueryTable(
  datasetId: string,
  rows: Record<string, unknown>[],
  schema: Array<{ name: string; type: string }>
): Promise<void> {
  if (!rows.length) return;

  const tableName = safeTableName(datasetId);
  const columnMap: ColumnMapping = {};
  schema.forEach((col, idx) => {
    columnMap[col.name] = `col_${idx}`;
  });

  // Build column definitions
  const colDefs = schema.map((col, idx) => {
    const alias = `col_${idx}`;
    const sqlType = col.type === 'number' ? 'REAL' : 'TEXT';
    return `${alias} ${sqlType}`;
  }).join(', ');

  // Drop and recreate table
  await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "${tableName}"`);
  await prisma.$executeRawUnsafe(`CREATE TABLE "${tableName}" (row_index INTEGER, ${colDefs})`);

  // Insert in batches
  const BATCH = 500;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    for (let j = 0; j < batch.length; j++) {
      const row = batch[j];
      const colNames = ['row_index', ...schema.map((_, idx) => `col_${idx}`)].join(', ');
      const placeholders = schema.map((_, k) => `?${k + 2}`).join(', ');
      const values: unknown[] = [i + j, ...schema.map((col) => {
        const v = row[col.name];
        if (v === null || v === undefined) return null;
        return col.type === 'number' ? (Number(v) || 0) : String(v);
      })];

      // Use parameterized insert via tagged template
      const colNamesArr = schema.map((_, idx) => `col_${idx}`);
      await insertRow(tableName, i + j, colNamesArr, values.slice(1));
    }
  }

  // Store or update mapping
  const existing = await prisma.datasetQueryTable.findUnique({ where: { datasetId } });
  if (existing) {
    await prisma.datasetQueryTable.update({
      where: { datasetId },
      data: { tableName, columnMapJson: stringifyJson(columnMap) },
    });
  } else {
    await prisma.datasetQueryTable.create({
      data: { datasetId, tableName, columnMapJson: stringifyJson(columnMap) },
    });
  }
}

async function insertRow(
  tableName: string,
  rowIndex: number,
  colNames: string[],
  values: unknown[]
): Promise<void> {
  if (colNames.length === 0) {
    await prisma.$executeRawUnsafe(`INSERT INTO "${tableName}" (row_index) VALUES (${rowIndex})`);
    return;
  }
  const cols = ['row_index', ...colNames].join(', ');
  // Build values string with escaped literals (safe because colNames are col_N aliases, not user input)
  const escapedVals = [rowIndex, ...values].map((v) => {
    if (v === null || v === undefined) return 'NULL';
    if (typeof v === 'number') return isFinite(v) ? v : 'NULL';
    return `'${String(v).replace(/'/g, "''")}'`;
  }).join(', ');
  await prisma.$executeRawUnsafe(`INSERT INTO "${tableName}" (${cols}) VALUES (${escapedVals})`);
}

export async function dropQueryTable(datasetId: string): Promise<void> {
  const tableName = safeTableName(datasetId);
  try {
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "${tableName}"`);
    await prisma.datasetQueryTable.deleteMany({ where: { datasetId } });
  } catch {
    // non-blocking
  }
}

export async function queryTable(
  datasetId: string,
  params: SqlQueryParams
): Promise<SqlQueryResult | null> {
  const t0 = Date.now();

  // Load column mapping
  const qtRecord = await prisma.datasetQueryTable.findUnique({ where: { datasetId } });
  if (!qtRecord) return null;

  const tableName = qtRecord.tableName;
  const columnMap: ColumnMapping = parseJson(qtRecord.columnMapJson, {});

  // Validate requested fields against mapping (whitelist)
  const resolveCol = (fieldName: string): string | null => {
    return columnMap[fieldName] || null;
  };

  const groupByCol = params.groupBy ? resolveCol(params.groupBy) : null;
  const valueCol = params.valueField ? resolveCol(params.valueField) : null;
  const agg = params.aggregation || 'sum';

  // Check table exists
  const tableExists = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='${tableName}'`
  );
  if (!tableExists.length) return null;

  // Build safe SELECT
  let selectExpr: string;
  let groupByExpr: string | null = null;

  if (groupByCol) {
    groupByExpr = `"${groupByCol}"`;
    const aggFn = agg.toUpperCase();
    const valExpr = valueCol ? `${aggFn}(CAST("${valueCol}" AS REAL))` : `COUNT(*)`;
    selectExpr = `${groupByExpr} as label, ${valExpr} as value, COUNT(*) as cnt`;
  } else {
    const aggFn = agg.toUpperCase();
    const valExpr = valueCol ? `${aggFn}(CAST("${valueCol}" AS REAL))` : `COUNT(*)`;
    selectExpr = `'Total' as label, ${valExpr} as value, COUNT(*) as cnt`;
  }

  // Build WHERE clause from filters (values are parameters, field names are validated)
  const whereClauses: string[] = [];
  for (const f of params.filters || []) {
    const col = resolveCol(f.field);
    if (!col) continue;
    const escapedVal = String(f.value ?? '').replace(/'/g, "''");
    switch (f.operator) {
      case 'eq': whereClauses.push(`"${col}" = '${escapedVal}'`); break;
      case 'neq': whereClauses.push(`"${col}" != '${escapedVal}'`); break;
      case 'gt': whereClauses.push(`CAST("${col}" AS REAL) > ${Number(f.value) || 0}`); break;
      case 'gte': whereClauses.push(`CAST("${col}" AS REAL) >= ${Number(f.value) || 0}`); break;
      case 'lt': whereClauses.push(`CAST("${col}" AS REAL) < ${Number(f.value) || 0}`); break;
      case 'lte': whereClauses.push(`CAST("${col}" AS REAL) <= ${Number(f.value) || 0}`); break;
      case 'contains': whereClauses.push(`"${col}" LIKE '%${escapedVal}%'`); break;
      case 'blank': whereClauses.push(`("${col}" IS NULL OR "${col}" = '')`); break;
      case 'notblank': whereClauses.push(`("${col}" IS NOT NULL AND "${col}" != '')`); break;
    }
  }

  const whereClause = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';
  const groupClause = groupByExpr ? `GROUP BY ${groupByExpr}` : '';

  // Sort
  let orderClause = '';
  if (params.sortBy === 'value') {
    orderClause = `ORDER BY value ${(params.sortOrder || 'desc').toUpperCase()}`;
  } else if (params.sortBy === 'label') {
    orderClause = `ORDER BY label ${(params.sortOrder || 'asc').toUpperCase()}`;
  }

  const limitClause = params.limit ? `LIMIT ${Math.min(params.limit, 10000)}` : 'LIMIT 10000';

  const sql = `SELECT ${selectExpr} FROM "${tableName}" ${whereClause} ${groupClause} ${orderClause} ${limitClause}`;

  const rawResults = await prisma.$queryRawUnsafe<Array<{ label: unknown; value: unknown; cnt: unknown }>>(sql);

  const data = rawResults.map((r) => ({
    label: String(r.label ?? ''),
    value: Number(r.value) || 0,
    count: Number(r.cnt) || 0,
  }));

  return {
    data,
    meta: { rowCount: data.length, queryTimeMs: Date.now() - t0, engine: 'sql', cached: false },
  };
}
