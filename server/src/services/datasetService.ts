import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export type ColumnType = 'text' | 'number' | 'date' | 'boolean';

export interface ColumnSchema {
  name: string;
  type: ColumnType;
  nullable: boolean;
  sampleValues: unknown[];
}

function detectType(values: unknown[]): ColumnType {
  const nonNull = values.filter((v) => v !== null && v !== undefined && v !== '');
  if (nonNull.length === 0) return 'text';

  const boolPatterns = ['true', 'false', '1', '0', 'yes', 'no'];
  if (nonNull.every((v) => boolPatterns.includes(String(v).toLowerCase()))) return 'boolean';

  if (nonNull.every((v) => !isNaN(Number(v)) && v !== '')) return 'number';

  const dateCount = nonNull.filter((v) => {
    const d = new Date(String(v));
    return !isNaN(d.getTime()) && String(v).length > 4;
  }).length;
  if (dateCount / nonNull.length > 0.7) return 'date';

  return 'text';
}

export function inferSchema(rows: Record<string, unknown>[]): ColumnSchema[] {
  if (!rows.length) return [];
  const columns = Object.keys(rows[0]);
  const sample = rows.slice(0, 100);

  return columns.map((name) => {
    const values = sample.map((r) => r[name]);
    const nonNull = values.filter((v) => v !== null && v !== undefined && v !== '');
    return {
      name,
      type: detectType(values),
      nullable: nonNull.length < values.length,
      sampleValues: values.slice(0, 5),
    };
  });
}

export function parseFile(filePath: string, _fileType: string): Record<string, unknown>[] {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.csv') {
    const content = fs.readFileSync(filePath, 'utf-8');
    const result = Papa.parse<Record<string, unknown>>(content, {
      header: true,
      skipEmptyLines: 'greedy',
      dynamicTyping: true,
      transformHeader: (h: string) => h.trim().replace(/^["']|["']$/g, '') || `col_${Math.random().toString(36).slice(2, 6)}`,
      transform: (value: string) => {
        // Strip commas from numbers like "1,234.56"
        const stripped = value.trim().replace(/,(?=\d{3}(?:[.,]|$))/g, '');
        if (stripped === '' || stripped === 'N/A' || stripped === 'n/a' || stripped === 'NULL' || stripped === 'null') return null;
        return stripped;
      },
    });
    // Filter out rows that are entirely null/empty
    return (result.data as Record<string, unknown>[]).filter((row) =>
      Object.values(row).some((v) => v !== null && v !== undefined && v !== '')
    );
  }

  if (ext === '.xlsx' || ext === '.xls') {
    const workbook = XLSX.readFile(filePath, { cellDates: true });
    // Use the first sheet
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: null,
      raw: false, // get formatted strings for dates
    });
    // Normalise headers: trim whitespace
    return rows.map((row) => {
      const cleaned: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(row)) {
        const key = String(k).trim() || `col_${Math.random().toString(36).slice(2, 6)}`;
        // Convert empty strings to null, try numeric coercion
        if (v === '' || v === 'N/A' || v === 'n/a' || v === 'NULL') {
          cleaned[key] = null;
        } else if (typeof v === 'string') {
          const stripped = v.replace(/,(?=\d{3}(?:[.,]|$))/g, '').trim();
          const num = Number(stripped);
          cleaned[key] = stripped !== '' && !isNaN(num) ? num : v;
        } else {
          cleaned[key] = v;
        }
      }
      return cleaned;
    }).filter((row) => Object.values(row).some((v) => v !== null && v !== undefined && v !== ''));
  }

  throw new Error(`Unsupported file type: ${ext}`);
}

export function applyTransformationSteps(
  rows: Record<string, unknown>[],
  steps: TransformStep[]
): Record<string, unknown>[] {
  let data = [...rows];

  for (const step of steps) {
    switch (step.type) {
      case 'renameColumn':
        data = data.map((r) => {
          const obj = { ...r };
          obj[step.newName!] = obj[step.column!];
          delete obj[step.column!];
          return obj;
        });
        break;

      case 'removeColumn':
        data = data.map((r) => {
          const obj = { ...r };
          delete obj[step.column!];
          return obj;
        });
        break;

      case 'filterRows':
        data = data.filter((r) => {
          const val = r[step.column!];
          switch (step.operator) {
            case 'eq': return val == step.value;
            case 'neq': return val != step.value;
            case 'gt': return Number(val) > Number(step.value);
            case 'lt': return Number(val) < Number(step.value);
            case 'contains': return String(val).toLowerCase().includes(String(step.value).toLowerCase());
            case 'notNull': return val !== null && val !== undefined && val !== '';
            default: return true;
          }
        });
        break;

      case 'sortRows':
        data = [...data].sort((a, b) => {
          const av = a[step.column!];
          const bv = b[step.column!];
          const dir = step.direction === 'asc' ? 1 : -1;
          if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
          return String(av).localeCompare(String(bv)) * dir;
        });
        break;

      case 'fillNull':
        data = data.map((r) => ({
          ...r,
          [step.column!]: (r[step.column!] === null || r[step.column!] === undefined || r[step.column!] === '')
            ? step.value
            : r[step.column!],
        }));
        break;

      case 'removeDuplicates':
        const seen = new Set<string>();
        data = data.filter((r) => {
          const key = JSON.stringify(step.columns ? step.columns.map((c) => r[c]) : r);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        break;

      case 'trimText':
        data = data.map((r) => ({
          ...r,
          [step.column!]: typeof r[step.column!] === 'string' ? (r[step.column!] as string).trim() : r[step.column!],
        }));
        break;

      case 'changeCase':
        data = data.map((r) => {
          const val = r[step.column!];
          if (typeof val !== 'string') return r;
          return {
            ...r,
            [step.column!]: step.caseType === 'upper' ? val.toUpperCase()
              : step.caseType === 'lower' ? val.toLowerCase()
              : val.charAt(0).toUpperCase() + val.slice(1).toLowerCase(),
          };
        });
        break;

      case 'addCalculatedColumn':
        data = data.map((r) => ({
          ...r,
          [step.newName!]: evaluateExpression(step.expression!, r),
        }));
        break;

      case 'changeType':
        data = data.map((r) => ({
          ...r,
          [step.column!]: convertType(r[step.column!], step.targetType!),
        }));
        break;
    }
  }

  return data;
}

/**
 * Safe arithmetic expression evaluator — NO eval() or Function().
 * Supports: column references, numeric literals, +, -, *, /, (, )
 */
function evaluateExpression(expr: string, row: Record<string, unknown>): unknown {
  // Substitute column names (longest first to avoid partial matches)
  const sortedKeys = Object.keys(row).sort((a, b) => b.length - a.length);
  let substituted = expr;
  for (const key of sortedKeys) {
    const safe = String(Number(row[key]) || 0);
    // Use word-boundary-like replacement: key must not be adjacent to word chars
    substituted = substituted.replace(
      new RegExp(`(?<![\\w.])${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w])`, 'g'),
      safe
    );
  }

  // Now evaluate the resulting numeric expression safely via recursive descent parser
  try {
    return parseArithmetic(substituted.trim());
  } catch {
    return null;
  }
}

function parseArithmetic(expr: string): number {
  let pos = 0;

  const peek = () => expr[pos] ?? '';
  const consume = () => expr[pos++] ?? '';
  const skipWs = () => { while (expr[pos] === ' ') pos++; };

  const parseNumber = (): number => {
    skipWs();
    let numStr = '';
    if (peek() === '-') { numStr += consume(); }
    while (/[\d.]/.test(peek())) numStr += consume();
    if (numStr === '' || numStr === '-') throw new Error('Invalid number');
    return parseFloat(numStr);
  };

  const parsePrimary = (): number => {
    skipWs();
    if (peek() === '(') {
      consume(); // '('
      const val = parseExpr();
      skipWs();
      if (peek() === ')') consume();
      return val;
    }
    return parseNumber();
  };

  const parseTerm = (): number => {
    let left = parsePrimary();
    skipWs();
    while (peek() === '*' || peek() === '/') {
      const op = consume();
      const right = parsePrimary();
      left = op === '*' ? left * right : right !== 0 ? left / right : 0;
      skipWs();
    }
    return left;
  };

  const parseExpr = (): number => {
    let left = parseTerm();
    skipWs();
    while (peek() === '+' || peek() === '-') {
      const op = consume();
      const right = parseTerm();
      left = op === '+' ? left + right : left - right;
      skipWs();
    }
    return left;
  };

  const result = parseExpr();
  return result;
}

function convertType(val: unknown, targetType: string): unknown {
  if (val === null || val === undefined) return null;
  switch (targetType) {
    case 'number': return Number(val) || null;
    case 'text': return String(val);
    case 'boolean': return ['true', '1', 'yes'].includes(String(val).toLowerCase());
    case 'date': { const d = new Date(String(val)); return isNaN(d.getTime()) ? null : d.toISOString(); }
    default: return val;
  }
}

export interface TransformStep {
  type: string;
  column?: string;
  newName?: string;
  value?: unknown;
  operator?: string;
  direction?: 'asc' | 'desc';
  columns?: string[];
  caseType?: 'upper' | 'lower' | 'title';
  expression?: string;
  targetType?: string;
}
