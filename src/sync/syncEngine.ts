import * as FileSystem from 'expo-file-system/legacy';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import {
  SYNC_TABLES,
  getDirtyRows,
  markRowsClean,
  upsertRemoteRow,
  getSyncMeta,
  setSyncMeta,
  setLastSyncedAt,
  DEFAULT_PHM_AREA_ID,
  getDatabase,
} from '../db';

export interface SyncResult {
  success: boolean;
  message: string;
  pushedCount: number;
  pulledCount: number;
  timestamp: string;
  errors?: string[];
}

let isSyncLocked = false;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(val: any): boolean {
  return typeof val === 'string' && UUID_REGEX.test(val);
}

function isAuthOrDeactivatedError(err: any): boolean {
  if (!err) return false;
  const msg = (err.message || '').toLowerCase();
  const status = err.status || 0;
  const code = err.code || '';
  return (
    status === 401 ||
    status === 403 ||
    code === 'PGRST301' ||
    msg.includes('banned') ||
    msg.includes('deactivated') ||
    msg.includes('user not found') ||
    msg.includes('jwt expired')
  );
}


// Tables that contain JSON columns in SQLite that should be parsed into JSON objects for Postgres jsonb
const JSON_COLUMNS_BY_TABLE: Record<string, string[]> = {
  mothers: ['chronic_conditions_json'],
  mother_transfers: ['handover_summary_json'],
  pregnancies: ['risk_factors_json', 'hospital_delivery_notes_json'],
  antenatal_visits: ['danger_signs_json', 'supplements_json'],
  child_growth_records: ['milestones_json', 'supplements_json'],
};

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

async function tryUploadVoiceNote(
  phmAreaId: string,
  visitId: string,
  localUri: string
): Promise<string | null> {
  try {
    const fileInfo = await FileSystem.getInfoAsync(localUri);
    if (!fileInfo.exists) return null;

    const base64 = await FileSystem.readAsStringAsync(localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const arrayBuffer = base64ToArrayBuffer(base64);
    const remotePath = `${phmAreaId}/${visitId}.m4a`;

    const { data, error } = await supabase.storage
      .from('voice-notes')
      .upload(remotePath, arrayBuffer, {
        contentType: 'audio/m4a',
        upsert: true,
      });

    if (error || !data) {
      return null;
    }
    return remotePath;
  } catch {
    return null;
  }
}

function prepareRowForPush(table: string, row: Record<string, any>): Record<string, any> | null {
  const clean: Record<string, any> = { ...row };

  // Guard: ID must be a valid RFC 4122 UUID for Postgres
  if (!isValidUuid(clean.id)) {
    return null;
  }

  // Remove local-only sync flag
  delete clean.is_dirty;

  // Ensure phm_area_id is present and valid
  if (!isValidUuid(clean.phm_area_id)) {
    clean.phm_area_id = DEFAULT_PHM_AREA_ID;
  }

  // Sanitize foreign key UUID references
  if (clean.family_id !== undefined && !isValidUuid(clean.family_id)) {
    if (table === 'mother_transfers') return null; // Required FK
    clean.family_id = null;
  }
  if (clean.mother_id !== undefined && !isValidUuid(clean.mother_id)) {
    if (table === 'pregnancies' || table === 'mother_transfers') return null; // Required FK
    clean.mother_id = null;
  }
  if (clean.pregnancy_id !== undefined && !isValidUuid(clean.pregnancy_id)) {
    if (table === 'antenatal_visits' || table === 'fetal_kick_logs' || table === 'postnatal_meows') return null; // Required FK
    clean.pregnancy_id = null;
  }
  if (clean.child_id !== undefined && !isValidUuid(clean.child_id)) {
    return null; // Required FK for growth records and immunizations
  }
  if (clean.target_id !== undefined && !isValidUuid(clean.target_id)) {
    return null; // Required FK for tasks
  }

  // Parse JSON string fields to objects/arrays for Supabase jsonb
  const jsonCols = JSON_COLUMNS_BY_TABLE[table] || [];
  for (const col of jsonCols) {
    if (typeof clean[col] === 'string') {
      try {
        clean[col] = JSON.parse(clean[col]);
      } catch {
        clean[col] = col.endsWith('notes_json') ? {} : [];
      }
    }
  }

  return clean;
}

export async function runFullSync(): Promise<SyncResult> {
  const timestamp = new Date().toISOString();

  // 1. Guard: Check if Supabase credentials are configured
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      message: 'Supabase credentials not configured. App is running in 100% Offline Demo Mode.',
      pushedCount: 0,
      pulledCount: 0,
      timestamp,
    };
  }

  // 2. Guard: Check if user has an active authenticated session
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    return {
      success: false,
      message: 'Running in Offline Demo Mode. Sign in with your PHM staff account to sync with the central cloud.',
      pushedCount: 0,
      pulledCount: 0,
      timestamp,
    };
  }

  // 2b. Guard: Verify user account status and ensure account is not deactivated or banned
  const { error: userError } = await supabase.auth.getUser();
  if (userError && isAuthOrDeactivatedError(userError)) {
    await setSyncMeta('last_sync_status', 'ACCOUNT_DEACTIVATED');
    return {
      success: false,
      message: 'Staff account deactivated or session expired — your local clinical records are safely preserved. Please contact your MOH office.',
      pushedCount: 0,
      pulledCount: 0,
      timestamp,
      errors: [userError.message],
    };
  }

  // 3. Concurrency Lock: Prevent overlapping sync executions
  if (isSyncLocked) {
    return {
      success: false,
      message: 'A synchronization operation is already in progress.',
      pushedCount: 0,
      pulledCount: 0,
      timestamp,
    };
  }

  isSyncLocked = true;
  let totalPushed = 0;
  let totalPulled = 0;
  const syncErrors: string[] = [];

  try {
    // -------------------------------------------------------------------------
    // STEP A: Push Local Changes to Supabase (Dependency Order)
    // -------------------------------------------------------------------------
    for (const table of SYNC_TABLES) {
      try {
        const dirtyRows = await getDirtyRows(table);
        if (dirtyRows.length > 0) {
          // If pushing antenatal_visits, upload any pending voice notes to Supabase Storage
          if (table === 'antenatal_visits') {
            for (const row of dirtyRows) {
              if (row.voice_note_local_uri && !row.voice_note_remote_url) {
                const remotePath = await tryUploadVoiceNote(
                  row.phm_area_id || DEFAULT_PHM_AREA_ID,
                  row.id,
                  row.voice_note_local_uri
                );
                if (remotePath) {
                  row.voice_note_remote_url = remotePath;
                  try {
                    const db = await getDatabase();
                    await db.runAsync(
                      'UPDATE antenatal_visits SET voice_note_remote_url = ? WHERE id = ?',
                      [remotePath, row.id]
                    );
                  } catch {
                    // Non-blocking
                  }
                }
              }
            }
          }

          const payload = dirtyRows
            .map((r) => prepareRowForPush(table, r))
            .filter((r): r is Record<string, any> => r !== null);

          if (payload.length > 0) {
            const { error } = await supabase
              .from(table)
              .upsert(payload, { onConflict: 'id' });

            if (error) {
              if (isAuthOrDeactivatedError(error)) {
                await setSyncMeta('last_sync_status', 'ACCOUNT_DEACTIVATED');
                return {
                  success: false,
                  message: 'Staff account deactivated or access revoked. Local records are safely preserved. Please contact your MOH office.',
                  pushedCount: totalPushed,
                  pulledCount: totalPulled,
                  timestamp,
                  errors: [error.message],
                };
              }
              console.error(`Error pushing ${table} to Supabase:`, error);
              syncErrors.push(`${table} push: ${error.message}`);
            } else {
              const pushedIds = payload.map((r) => r.id as string);
              await markRowsClean(table, pushedIds);
              totalPushed += pushedIds.length;
            }
          }
        }
      } catch (err: any) {
        syncErrors.push(`${table} push failed: ${err?.message || 'Unknown error'}`);
      }
    }

    // -------------------------------------------------------------------------
    // STEP B: Pull Remote Updates from Supabase (LWW Conflict Resolution)
    // -------------------------------------------------------------------------
    for (const table of SYNC_TABLES) {
      try {
        const metaKey = `last_pulled_${table}`;
        const lastPulledAt = (await getSyncMeta(metaKey)) || '1970-01-01T00:00:00.000Z';

        let query = supabase
          .from(table)
          .select('*')
          .gt('updated_at', lastPulledAt)
          .order('updated_at', { ascending: true })
          .limit(100);

        const { data: remoteRows, error } = await query;

        if (error) {
          if (isAuthOrDeactivatedError(error)) {
            await setSyncMeta('last_sync_status', 'ACCOUNT_DEACTIVATED');
            return {
              success: false,
              message: 'Staff account deactivated or access revoked. Local records are safely preserved. Please contact your MOH office.',
              pushedCount: totalPushed,
              pulledCount: totalPulled,
              timestamp,
              errors: [error.message],
            };
          }
          console.error(`Error pulling ${table} from Supabase:`, error);
          syncErrors.push(`${table} pull: ${error.message}`);
        } else if (remoteRows && remoteRows.length > 0) {
          let tablePulledCount = 0;

          for (const remoteRow of remoteRows) {
            const applied = await upsertRemoteRow(table, remoteRow);
            if (applied) {
              tablePulledCount++;
            }
          }

          totalPulled += tablePulledCount;

          // Record latest pulled timestamp for this table
          const latestRemoteTimestamp = remoteRows[remoteRows.length - 1].updated_at;
          await setSyncMeta(metaKey, latestRemoteTimestamp);
        }
      } catch (err: any) {
        syncErrors.push(`${table} pull failed: ${err?.message || 'Unknown error'}`);
      }
    }

    // Record overall sync status and timestamp
    await setLastSyncedAt(timestamp);
    await setSyncMeta('last_sync_status', syncErrors.length === 0 ? 'SUCCESS' : 'PARTIAL_SUCCESS');

    return {
      success: syncErrors.length === 0,
      message:
        syncErrors.length === 0
          ? `Sync successful. Pushed ${totalPushed} records, pulled ${totalPulled} updates.`
          : `Sync completed with warnings: ${syncErrors.join('; ')}`,
      pushedCount: totalPushed,
      pulledCount: totalPulled,
      timestamp,
      errors: syncErrors.length > 0 ? syncErrors : undefined,
    };
  } catch (globalErr: any) {
    const errorMsg = globalErr?.message || 'Unknown synchronization error';
    await setSyncMeta('last_sync_status', 'ERROR');
    return {
      success: false,
      message: `Sync failed: ${errorMsg}`,
      pushedCount: totalPushed,
      pulledCount: totalPulled,
      timestamp,
      errors: [errorMsg],
    };
  } finally {
    isSyncLocked = false;
  }
}

export function isSyncing(): boolean {
  return isSyncLocked;
}
