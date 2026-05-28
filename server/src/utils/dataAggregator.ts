export type AggregationType = 'sum' | 'avg' | 'count' | 'min' | 'max';

export interface AggregateOptions {
  rows: Record<string, unknown>[];
  groupBy?: string;
  valueField?: string;
  aggregation?: AggregationType;
  filters?: Array<{ field: string; operator: string; value: unknown }>;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
}

export interface AggregatedResult {
  label: string;
  value: number;
  count: number;
}

function applyFilters(
  rows: Record<string, unknown>[],
  filters: Array<{ field: string; operator: string; value: unknown }>
): Record<string, unknown>[] {
  return rows.filter((row) =>
    filters.every(({ field, operator, value }) => {
      const cell = row[field];
      switch (operator) {
        case 'eq': return cell == value;
        case 'neq': return cell != value;
        case 'gt': return Number(cell) > Number(value);
        case 'gte': return Number(cell) >= Number(value);
        case 'lt': return Number(cell) < Number(value);
        case 'lte': return Number(cell) <= Number(value);
        case 'contains': return String(cell).toLowerCase().includes(String(value).toLowerCase());
        case 'startsWith': return String(cell).toLowerCase().startsWith(String(value).toLowerCase());
        default: return true;
      }
    })
  );
}

function aggregate(values: number[], type: AggregationType): number {
  if (values.length === 0) return 0;
  switch (type) {
    case 'sum': return values.reduce((a, b) => a + b, 0);
    case 'avg': return values.reduce((a, b) => a + b, 0) / values.length;
    case 'count': return values.length;
    case 'min': return Math.min(...values);
    case 'max': return Math.max(...values);
    default: return 0;
  }
}

export function aggregateData(options: AggregateOptions): AggregatedResult[] {
  const { rows, groupBy, valueField, aggregation = 'sum', filters = [], sortBy, sortOrder = 'desc', limit } = options;

  let data = filters.length > 0 ? applyFilters(rows, filters) : rows;

  if (!groupBy) {
    const values = valueField ? data.map((r) => Number(r[valueField]) || 0) : [data.length];
    return [{ label: 'Total', value: aggregate(values, aggregation), count: data.length }];
  }

  const groups = new Map<string, number[]>();
  for (const row of data) {
    const key = String(row[groupBy] ?? 'Unknown');
    const val = valueField ? Number(row[valueField]) || 0 : 1;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(val);
  }

  let results: AggregatedResult[] = Array.from(groups.entries()).map(([label, values]) => ({
    label,
    value: aggregate(values, aggregation),
    count: values.length,
  }));

  if (sortBy === 'value') {
    results.sort((a, b) => sortOrder === 'asc' ? a.value - b.value : b.value - a.value);
  } else if (sortBy === 'label') {
    results.sort((a, b) => sortOrder === 'asc' ? a.label.localeCompare(b.label) : b.label.localeCompare(a.label));
  }

  if (limit) results = results.slice(0, limit);
  return results;
}

export function evaluateMeasure(expression: string, rows: Record<string, unknown>[]): number {
  const sumMatch = expression.match(/^SUM\((.+)\)$/i);
  const avgMatch = expression.match(/^AVG\((.+)\)$/i);
  const countMatch = expression.match(/^COUNT\((.+)\)$/i);
  const minMatch = expression.match(/^MIN\((.+)\)$/i);
  const maxMatch = expression.match(/^MAX\((.+)\)$/i);

  if (sumMatch) {
    const col = sumMatch[1].trim();
    return rows.reduce((acc, r) => acc + (Number(r[col]) || 0), 0);
  }
  if (avgMatch) {
    const col = avgMatch[1].trim();
    const vals = rows.map((r) => Number(r[col]) || 0);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  }
  if (countMatch) return rows.length;
  if (minMatch) {
    const col = minMatch[1].trim();
    return Math.min(...rows.map((r) => Number(r[col]) || 0));
  }
  if (maxMatch) {
    const col = maxMatch[1].trim();
    return Math.max(...rows.map((r) => Number(r[col]) || 0));
  }
  return 0;
}
