// SQLite stores JSON as strings — these helpers keep controller code clean

export function parseJson<T>(val: unknown, fallback: T): T {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'object') return val as T;
  try { return JSON.parse(val as string); } catch { return fallback; }
}

export function stringifyJson(val: unknown): string {
  if (typeof val === 'string') return val;
  return JSON.stringify(val ?? {});
}

// Attach parsed JSON fields to a dataset record
export function hydrateDataset(ds: Record<string, unknown>) {
  return { ...ds, schemaJson: parseJson(ds.schemaJson, []) };
}

export function hydrateReport(rp: Record<string, unknown>) {
  return {
    ...rp,
    layoutJson: parseJson(rp.layoutJson, { widgets: [] }),
    configJson: parseJson(rp.configJson, { theme: 'light', refreshInterval: 0, globalFilters: [] }),
  };
}

export function hydrateTransformation(t: Record<string, unknown>) {
  return { ...t, stepsJson: parseJson(t.stepsJson, []) };
}

export function hydrateActivityLog(log: Record<string, unknown>) {
  return { ...log, metadataJson: parseJson(log.metadataJson, {}) };
}
