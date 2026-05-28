import { parseJson, stringifyJson } from '../utils/json';
import { prisma } from '../utils/prisma';
import { inferSchema } from './datasetService';
import { createOrUpdateQueryTable } from './sqlQueryService';

export interface ConnectionConfig {
  type: 'postgresql' | 'mysql' | 'sqlite' | 'rest';
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  ssl?: boolean;
  url?: string;       // for REST or sqlite file path
}

function isPrivateIp(hostname: string): boolean {
  // Block private/loopback IPs in production
  if (process.env.NODE_ENV === 'development') return false;
  const privatePatterns = [
    /^localhost$/i,
    /^127\./,
    /^10\./,
    /^172\.(1[6-9]|2\d|3[01])\./,
    /^192\.168\./,
    /^::1$/,
    /^0\.0\.0\.0$/,
  ];
  return privatePatterns.some((p) => p.test(hostname));
}

export async function testConnection(config: ConnectionConfig & { password?: string }): Promise<{ success: boolean; message: string }> {
  try {
    if (config.type === 'rest') {
      const url = config.url || '';
      try {
        const parsed = new URL(url);
        if (isPrivateIp(parsed.hostname)) {
          return { success: false, message: 'Private/internal IP addresses are not allowed for REST connections' };
        }
      } catch {
        return { success: false, message: 'Invalid URL' };
      }
      const res = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(5000) });
      if (!res.ok) return { success: false, message: `HTTP ${res.status}` };
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('json')) return { success: false, message: 'Response is not JSON' };
      return { success: true, message: 'Connected successfully' };
    }

    if (config.type === 'postgresql') {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const pgModule = require('pg') as { Client: new (opts: Record<string, unknown>) => { connect(): Promise<void>; end(): Promise<void> } };
        const client = new pgModule.Client({
          host: config.host,
          port: config.port || 5432,
          database: config.database,
          user: config.username,
          password: config.password,
          ssl: config.ssl ? { rejectUnauthorized: false } : false,
          connectionTimeoutMillis: 5000,
        });
        await client.connect();
        await client.end();
        return { success: true, message: 'Connected successfully' };
      } catch (e: unknown) {
        if ((e as NodeJS.ErrnoException).code === 'MODULE_NOT_FOUND') {
          return { success: false, message: 'pg package not installed. Run: npm install pg' };
        }
        return { success: false, message: (e as Error).message };
      }
    }

    if (config.type === 'mysql') {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const mysql2 = require('mysql2/promise') as { createConnection(opts: Record<string, unknown>): Promise<{ end(): Promise<void> }> };
        const conn = await mysql2.createConnection({
          host: config.host,
          port: config.port || 3306,
          database: config.database,
          user: config.username,
          password: config.password,
          connectTimeout: 5000,
        });
        await conn.end();
        return { success: true, message: 'Connected successfully' };
      } catch (e: unknown) {
        if ((e as NodeJS.ErrnoException).code === 'MODULE_NOT_FOUND') {
          return { success: false, message: 'mysql2 package not installed. Run: npm install mysql2' };
        }
        return { success: false, message: (e as Error).message };
      }
    }

    if (config.type === 'sqlite') {
      return { success: true, message: 'SQLite connection configured (uses app database)' };
    }

    return { success: false, message: 'Unsupported connection type' };
  } catch (e) {
    return { success: false, message: (e as Error).message };
  }
}

export async function getConnectionSchema(
  connection: { type: string; configJson: string; encryptedSecretJson?: string }
): Promise<{ tables: Array<{ name: string; columns: string[] }> }> {
  const config = parseJson<ConnectionConfig>(connection.configJson, {} as ConnectionConfig);

  if (config.type === 'rest') {
    const url = config.url || '';
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      const data = await res.json() as unknown;
      const arr = Array.isArray(data) ? data : (data as Record<string, unknown[]>)[Object.keys(data as object)[0]] || [];
      const sample = arr[0];
      if (sample && typeof sample === 'object') {
        return { tables: [{ name: 'data', columns: Object.keys(sample as object) }] };
      }
    } catch {}
    return { tables: [] };
  }

  return { tables: [] };
}

export async function importTable(
  connection: { id: string; type: string; configJson: string },
  tableName: string,
  workspaceId: string,
  userId: string
): Promise<{ datasetId: string; rowCount: number }> {
  const config = parseJson<ConnectionConfig>(connection.configJson, {} as ConnectionConfig);

  let rows: Record<string, unknown>[] = [];

  if (config.type === 'rest') {
    const url = config.url || '';
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    const data = await res.json() as unknown;
    rows = Array.isArray(data) ? data as Record<string, unknown>[] : [];
  }

  const schema = inferSchema(rows);

  const dataset = await prisma.dataset.create({
    data: {
      workspaceId,
      name: tableName,
      fileName: tableName,
      fileType: 'connection',
      filePath: '',
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

  createOrUpdateQueryTable(dataset.id, rows, schema).catch(() => {});

  return { datasetId: dataset.id, rowCount: rows.length };
}
