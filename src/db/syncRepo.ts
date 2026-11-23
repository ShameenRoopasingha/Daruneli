import { getDatabase } from './database';

export const SYNC_TABLES = [
  'families',
  'mothers',
  'mother_transfers',
  'pregnancies',
  'antenatal_visits',
  'children',
  'child_growth_records',
  'immunizations',
  'tasks',
  'schedule_templates',
  'schedule_overrides',
  'fetal_kick_logs',
  'postnatal_meows',
] as const;

export type SyncTableName = (typeof SYNC_TABLES)[number];

export async function getPendingDirtyCount(): Promise<number> {
  const db = await getDatabase();
  let totalDirty = 0;

  for (const table of SYNC_TABLES) {
    try {
      const res = await db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM ${table} WHERE is_dirty = 1`
      );
      totalDirty += res?.count || 0;
    } catch {
      // ignore
    }
  }

  return totalDirty;
}

export async function getDirtyRows<T extends Record<string, any>>(table: SyncTableName): Promise<T[]> {
  const db = await getDatabase();
  return await db.getAllAsync<T>(`SELECT * FROM ${table} WHERE is_dirty = 1`);
}

export async function markRowsClean(table: SyncTableName, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const db = await getDatabase();
  const placeholders = ids.map(() => '?').join(',');
  await db.runAsync(
    `UPDATE ${table} SET is_dirty = 0 WHERE id IN (${placeholders})`,
    ids
  );
}

export async function getSyncMeta(key: string): Promise<string | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM sync_meta WHERE key = ?',
    [key]
  );
  return row?.value || null;
}

export async function setSyncMeta(key: string, value: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO sync_meta (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, value]
  );
}

export async function getLastSyncedAt(): Promise<string | null> {
  return await getSyncMeta('last_synced_at');
}

export async function setLastSyncedAt(timestamp: string): Promise<void> {
  await setSyncMeta('last_synced_at', timestamp);
}

/**
 * Upserts a remote row into local SQLite using Last-Write-Wins (LWW) conflict resolution.
 * If the local row has is_dirty = 1 AND a newer updated_at than the remote row, the local change is preserved.
 * Otherwise, the remote row overwrites the local row and is_dirty is set to 0.
 */
export async function upsertRemoteRow(
  table: SyncTableName,
  remoteRow: Record<string, any>
): Promise<boolean> {
  const db = await getDatabase();

  // Check existing local row
  const localRow = await db.getFirstAsync<{ id: string; updated_at: string; is_dirty: number }>(
    `SELECT id, updated_at, is_dirty FROM ${table} WHERE id = ?`,
    [remoteRow.id]
  );

  if (localRow && localRow.is_dirty === 1) {
    const localTime = new Date(localRow.updated_at).getTime();
    const remoteTime = new Date(remoteRow.updated_at).getTime();
    if (localTime > remoteTime) {
      // Local row is newer and dirty; preserve local change (LWW)
      return false;
    }
  }

  // Convert JSON fields to strings if they come back as objects from Supabase
  const normalized: Record<string, any> = { ...remoteRow, is_dirty: 0 };
  for (const [key, val] of Object.entries(normalized)) {
    if (val !== null && typeof val === 'object' && !(val instanceof Date)) {
      normalized[key] = JSON.stringify(val);
    }
  }

  // Get table column names to ensure we only insert known columns
  const tableColumns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  const validColNames = new Set(tableColumns.map((c) => c.name));

  const colsToInsert: string[] = [];
  const valsToInsert: any[] = [];

  for (const [key, val] of Object.entries(normalized)) {
    if (validColNames.has(key)) {
      colsToInsert.push(key);
      valsToInsert.push(val);
    }
  }

  const colList = colsToInsert.join(', ');
  const placeholderList = colsToInsert.map(() => '?').join(', ');
  const updateClause = colsToInsert
    .filter((col) => col !== 'id')
    .map((col) => `${col} = excluded.${col}`)
    .join(', ');

  await db.runAsync(
    `INSERT INTO ${table} (${colList}) VALUES (${placeholderList})
     ON CONFLICT(id) DO UPDATE SET ${updateClause}`,
    valsToInsert
  );

  return true;
}
