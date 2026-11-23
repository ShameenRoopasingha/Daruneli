import { useState, useEffect, useCallback, useRef } from 'react';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { runFullSync, isSyncing, type SyncResult } from './syncEngine';
import { getPendingDirtyCount, getLastSyncedAt } from '../db';
import { supabase, isSupabaseConfigured } from './supabaseClient';

export interface UseAutoSyncReturn {
  isOnline: boolean;
  isSyncingNow: boolean;
  dirtyCount: number;
  lastSyncedAt: string | null;
  isConfigured: boolean;
  triggerSync: () => Promise<SyncResult>;
  refreshStatus: () => Promise<void>;
}

export function useAutoSync(): UseAutoSyncReturn {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isSyncingNow, setIsSyncingNow] = useState<boolean>(false);
  const [dirtyCount, setDirtyCount] = useState<number>(0);
  const [lastSyncedAt, setLastSyncedAtState] = useState<string | null>(null);

  const prevOnlineRef = useRef<boolean>(true);

  const refreshStatus = useCallback(async () => {
    try {
      const [count, lastSync] = await Promise.all([
        getPendingDirtyCount(),
        getLastSyncedAt(),
      ]);
      setDirtyCount(count);
      setLastSyncedAtState(lastSync);
      setIsSyncingNow(isSyncing());
    } catch {
      // ignore
    }
  }, []);

  const triggerSync = useCallback(async (): Promise<SyncResult> => {
    setIsSyncingNow(true);
    try {
      const result = await runFullSync();
      await refreshStatus();
      return result;
    } finally {
      setIsSyncingNow(false);
    }
  }, [refreshStatus]);

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      try {
        const [count, lastSync] = await Promise.all([
          getPendingDirtyCount(),
          getLastSyncedAt(),
        ]);
        if (isMounted) {
          setDirtyCount(count);
          setLastSyncedAtState(lastSync);
          setIsSyncingNow(isSyncing());
        }
      } catch {
        // ignore
      }
    })();

    // Subscribe to network changes
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const online = Boolean(state.isConnected && state.isInternetReachable !== false);
      const wasOffline = !prevOnlineRef.current;
      prevOnlineRef.current = online;
      setIsOnline(online);

      // Auto-trigger sync on transition from offline to online if user has a session
      if (online && wasOffline && isSupabaseConfigured()) {
        supabase.auth.getSession().then(({ data }) => {
          if (data.session) {
            triggerSync();
          }
        }).catch(() => {});
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [triggerSync]);

  return {
    isOnline,
    isSyncingNow,
    dirtyCount,
    lastSyncedAt,
    isConfigured: isSupabaseConfigured(),
    triggerSync,
    refreshStatus,
  };
}
