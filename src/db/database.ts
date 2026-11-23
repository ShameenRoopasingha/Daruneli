import * as SQLite from 'expo-sqlite';
import { CREATE_TABLES_SQL, DEFAULT_PHM_AREA_ID } from './schema';

let db: SQLite.SQLiteDatabase | null = null;
let isMigrating = false;

const SYNCED_TABLES = [
  'families',
  'mothers',
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
];

export async function ensurePhase2Columns(database: SQLite.SQLiteDatabase): Promise<void> {
  // Ensure all base tables (including schedule_templates & schedule_overrides) and sync_meta exist
  await database.execAsync(CREATE_TABLES_SQL);

  for (const table of SYNCED_TABLES) {
    try {
      const columns = await database.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
      const colNames = new Set(columns.map((c) => c.name));

      if (columns.length > 0) {
        if (!colNames.has('phm_area_id')) {
          await database.execAsync(
            `ALTER TABLE ${table} ADD COLUMN phm_area_id TEXT NOT NULL DEFAULT '${DEFAULT_PHM_AREA_ID}';`
          );
        }

        if (!colNames.has('is_dirty')) {
          await database.execAsync(
            `ALTER TABLE ${table} ADD COLUMN is_dirty INTEGER NOT NULL DEFAULT 1;`
          );
        }

        // Clinical charts column additions for pre-existing tables
        if (table === 'pregnancies') {
          if (!colNames.has('booking_weight_kg')) {
            await database.execAsync('ALTER TABLE pregnancies ADD COLUMN booking_weight_kg REAL;');
          }
          if (!colNames.has('booking_height_cm')) {
            await database.execAsync('ALTER TABLE pregnancies ADD COLUMN booking_height_cm REAL;');
          }
          if (!colNames.has('booking_bmi')) {
            await database.execAsync('ALTER TABLE pregnancies ADD COLUMN booking_bmi REAL;');
          }
          if (!colNames.has('hospital_delivery_notes_json')) {
            await database.execAsync("ALTER TABLE pregnancies ADD COLUMN hospital_delivery_notes_json TEXT DEFAULT '{}';");
          }
        }
        if (table === 'antenatal_visits') {
          if (!colNames.has('sfh_cm')) {
            await database.execAsync('ALTER TABLE antenatal_visits ADD COLUMN sfh_cm REAL;');
          }
        }
        if (table === 'children') {
          if (!colNames.has('gestational_age_at_birth_weeks')) {
            await database.execAsync('ALTER TABLE children ADD COLUMN gestational_age_at_birth_weeks REAL DEFAULT 39;');
          }
        }
        if (table === 'child_growth_records') {
          if (!colNames.has('head_circumference_cm')) {
            await database.execAsync('ALTER TABLE child_growth_records ADD COLUMN head_circumference_cm REAL;');
          }
        }

        // Safe creation of sync dirty index now that column is guaranteed to exist
        await database.execAsync(
          `CREATE INDEX IF NOT EXISTS idx_${table}_dirty ON ${table}(is_dirty);`
        );
      }
    } catch (err) {
      console.warn(`Migration check warning for table ${table}:`, err);
    }
  }
}

async function runMigrations(database: SQLite.SQLiteDatabase): Promise<void> {
  if (isMigrating) return;
  isMigrating = true;

  try {
    // 1. Ensure all base tables and Phase 2 columns exist
    await ensurePhase2Columns(database);

    // 3. Migrate legacy non-hex seed IDs if present in SQLite
    try {
      const legacyRow = await database.getFirstAsync<{ id: string }>(
        "SELECT id FROM mothers WHERE id LIKE 'm0000001%' OR id LIKE 'M0000001%' LIMIT 1"
      );
      if (legacyRow) {
        console.log('Detected legacy non-hex seed IDs in SQLite. Re-seeding database with RFC 4122 UUIDs...');
        const { seedDatabase } = await import('./seed');
        await seedDatabase(true, database);
        console.log('Database successfully upgraded with valid RFC 4122 UUIDs.');
      }
    } catch (err) {
      console.warn('Legacy seed migration check note:', err);
    }

    // 4. Ensure schedule templates are seeded if empty
    try {
      const { seedScheduleTemplatesIfEmpty } = await import('./seed');
      await seedScheduleTemplatesIfEmpty(database);
    } catch (err) {
      console.warn('Seed schedule templates check note:', err);
    }
  } finally {
    isMigrating = false;
  }
}

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  const database = await SQLite.openDatabaseAsync('suwa_phm.db');
  db = database; // Set singleton immediately so re-entrant calls return this instance
  await database.execAsync('PRAGMA journal_mode = WAL;');
  await runMigrations(database);
  await database.execAsync('PRAGMA foreign_keys = ON;');
  return db;
}

export async function resetDatabase(): Promise<void> {
  const database = await getDatabase();
  await database.execAsync(`
    DELETE FROM postnatal_meows;
    DELETE FROM fetal_kick_logs;
    DELETE FROM schedule_overrides;
    DELETE FROM schedule_templates;
    DELETE FROM tasks;
    DELETE FROM immunizations;
    DELETE FROM child_growth_records;
    DELETE FROM children;
    DELETE FROM antenatal_visits;
    DELETE FROM pregnancies;
    DELETE FROM mothers;
    DELETE FROM families;
    DELETE FROM sync_meta;
  `);
}

// Generic helper types
export type Row = Record<string, unknown>;
