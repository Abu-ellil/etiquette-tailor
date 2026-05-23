import React, { useState, useEffect } from 'react';
import { useTranslation } from '../contexts/I18nContext';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface SyncStatus {
  enabled: boolean;
  intervalMinutes: number;
  lastSync: string | null;
  pendingChanges: number;
  syncSource: string;
}

interface SyncResult {
  success: boolean;
  pushed?: number;
  pulled?: number;
  errors?: string[];
  lastSyncAt?: string;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function SyncPage() {
  const { t } = useTranslation();

  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);
  const [autoSyncToggle, setAutoSyncToggle] = useState(false);
  const [autoInterval, setAutoInterval] = useState(60);
  const [autoSyncLoading, setAutoSyncLoading] = useState(false);
  const [backfilling, setBackfilling] = useState(false);
  const [backfillResult, setBackfillResult] = useState<{ orders: number; customers: number; items: number; tasks: number; payments: number; users: number; pieceTypes: number } | null>(null);

  // Load status on mount
  useEffect(() => {
    loadStatus();
  }, []);

  // Listen for sync completion events
  useEffect(() => {
    const unsubscribe = window.electronAPI?.sync?.onCompleted?.((data: any) => {
      if (data.success) {
        setLastResult({
          success: true,
          pushed: data.pushed,
          pulled: data.pulled,
          lastSyncAt: new Date().toISOString(),
        });
        loadStatus();
      }
    });
    return () => unsubscribe?.();
  }, []);

  async function loadStatus() {
    try {
      const s = await window.electronAPI.sync.getStatus();
      setStatus(s);
      setAutoSyncToggle(s.enabled);
      setAutoInterval(s.intervalMinutes);
    } catch (err) {
      console.error('Failed to load sync status:', err);
    }
  }

  async function handleSync() {
    setSyncing(true);
    setLastResult(null);
    try {
      const result = await window.electronAPI.sync.perform();
      setLastResult(result);
      await loadStatus();
    } catch (err: any) {
      setLastResult({ success: false, errors: [err.message] });
    } finally {
      setSyncing(false);
    }
  }

  async function handleAutoSyncToggle(enabled: boolean) {
    setAutoSyncLoading(true);
    setAutoSyncToggle(enabled);
    try {
      if (enabled) {
        await window.electronAPI.sync.enable();
      } else {
        await window.electronAPI.sync.disable();
      }
      await loadStatus();
    } catch (err) {
      console.error('Failed to toggle auto-sync:', err);
      setAutoSyncToggle(!enabled);
    } finally {
      setAutoSyncLoading(false);
    }
  }

  async function handleIntervalChange(minutes: number) {
    setAutoInterval(minutes);
    try {
      await window.electronAPI.sync.setInterval(minutes);
    } catch (err) {
      console.error('Failed to set sync interval:', err);
    }
  }

  async function handleBackfill() {
    if (!window.confirm(t('This will add all existing orders, customers, and payments to the sync queue. Continue?'))) return;
    setBackfilling(true);
    setBackfillResult(null);
    try {
      const result = await window.electronAPI.sync.backfill();
      setBackfillResult(result);
      await loadStatus();
    } catch (err: any) {
      console.error('Backfill failed:', err);
      window.alert(t('Failed to backfill data: ') + err.message);
    } finally {
      setBackfilling(false);
    }
  }

  const formatTimestamp = (ts: string | null) => {
    if (!ts) return '--';
    try {
      const d = new Date(ts);
      return d.toLocaleString();
    } catch {
      return ts;
    }
  };

  const formatMinutes = (mins: number) => {
    if (mins < 60) return `${mins} min`;
    const hours = Math.floor(mins / 60);
    const remaining = mins % 60;
    return remaining > 0 ? `${hours}h ${remaining}m` : `${hours}h`;
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-on-surface">{t('Branch Sync')}</h1>
        <p className="text-sm text-secondary mt-1">{t('Sync data between branches using Supabase cloud database')}</p>
      </div>

      {/* Connection Status */}
      <div className="bg-surface-container-lowest rounded-2xl shadow-[0px_8px_24px_rgba(25,28,29,0.08)] p-5">
        <h2 className="text-base font-semibold text-on-surface mb-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-green-600">cloud</span>
          {t('Connected to Supabase')}
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-surface-container-high rounded-xl p-3">
            <p className="text-xs text-secondary mb-1">{t('Branch ID')}</p>
            <p className="text-sm font-semibold text-on-surface">{status?.syncSource || '--'}</p>
          </div>
          <div className="bg-surface-container-high rounded-xl p-3">
            <p className="text-xs text-secondary mb-1">{t('Pending Changes')}</p>
            <p className="text-sm font-semibold text-on-surface">{status?.pendingChanges || 0}</p>
          </div>
        </div>
      </div>

      {/* Auto-Sync */}
      <div className="bg-surface-container-lowest rounded-2xl shadow-[0px_8px_24px_rgba(25,28,29,0.08)] p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">sync</span>
            {t('Automatic Sync')}
          </h2>
          <button
            onClick={() => handleAutoSyncToggle(!autoSyncToggle)}
            disabled={autoSyncLoading}
            className={`relative w-12 h-6 rounded-full transition-colors ${autoSyncToggle ? 'bg-primary' : 'bg-surface-container-high'} ${autoSyncLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${autoSyncToggle ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
        </div>

        {autoSyncToggle && (
          <>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-secondary">{t('Sync Interval')}</span>
              <div className="flex items-center gap-2">
                {[15, 30, 60, 120].map(mins => (
                  <button
                    key={mins}
                    onClick={() => handleIntervalChange(mins)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${autoInterval === mins ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-secondary hover:bg-surface-container-high/80'}`}
                  >
                    {formatMinutes(mins)}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-surface-container-high rounded-xl p-3">
              <p className="text-xs text-secondary mb-1">{t('Last Sync')}</p>
              <p className="text-sm font-semibold text-on-surface">{formatTimestamp(status?.lastSync || null)}</p>
            </div>
          </>
        )}
      </div>

      {/* Manual Sync */}
      <div className="bg-surface-container-lowest rounded-2xl shadow-[0px_8px_24px_rgba(25,28,29,0.08)] p-5">
        <h2 className="text-base font-semibold text-on-surface mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">sync_alt</span>
          {t('Manual Sync')}
        </h2>
        <div className="flex gap-3">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary text-on-primary font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {syncing ? (
              <>
                <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                {t('Syncing...')}
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-lg">cloud_sync</span>
                {t('Sync Now')}
              </>
            )}
          </button>
          <button
            onClick={handleBackfill}
            disabled={backfilling}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-secondary-container text-on-secondary-container font-semibold text-sm hover:bg-secondary-container/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {backfilling ? (
              <>
                <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                {t('Backfilling...')}
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-lg">upload</span>
                {t('Backfill Existing')}
              </>
            )}
          </button>
        </div>
        {backfillResult && (
          <div className="mt-3 bg-primary/10 rounded-lg p-3 text-xs">
            <p className="font-semibold text-primary mb-1">{t('Added to sync queue:')}</p>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div><span className="font-bold">{backfillResult.orders}</span> {t('Orders')}</div>
              <div><span className="font-bold">{backfillResult.customers}</span> {t('Customers')}</div>
              <div><span className="font-bold">{backfillResult.items}</span> {t('Items')}</div>
              <div><span className="font-bold">{backfillResult.tasks}</span> {t('Tasks')}</div>
              <div><span className="font-bold">{backfillResult.payments}</span> {t('Payments')}</div>
              <div><span className="font-bold">{backfillResult.users}</span> {t('Users')}</div>
              <div><span className="font-bold">{backfillResult.pieceTypes}</span> {t('Piece Types')}</div>
            </div>
          </div>
        )}
      </div>

      {/* Result */}
      {lastResult && (
        <div className={`rounded-2xl shadow-[0px_8px_24px_rgba(25,28,29,0.08)] p-5 ${lastResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          {lastResult.success ? (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-green-600">check_circle</span>
                <h3 className="text-sm font-semibold text-green-800">{t('Sync Successful')}</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-green-700">{lastResult.pushed || 0}</p>
                  <p className="text-xs text-secondary">{t('Changes Pushed')}</p>
                </div>
                <div className="bg-white rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-green-700">{lastResult.pulled || 0}</p>
                  <p className="text-xs text-secondary">{t('Changes Pulled')}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined text-red-600 mt-0.5">error</span>
              <div>
                <h3 className="text-sm font-semibold text-red-800">{t('Sync Failed')}</h3>
                <p className="text-xs text-red-600 mt-1">{lastResult.errors?.join(', ')}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      <div className="bg-surface-container-lowest rounded-2xl shadow-[0px_8px_24px_rgba(25,28,29,0.08)] p-5">
        <h2 className="text-base font-semibold text-on-surface mb-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">info</span>
          {t('How it Works')}
        </h2>
        <ul className="text-sm text-secondary space-y-2 list-disc list-inside">
          <li>{t('Your data is synced to Supabase cloud database')}</li>
          <li>{t('Both branches automatically share data when sync is enabled')}</li>
          <li>{t('Changes are pushed immediately, pulled every sync interval')}</li>
          <li>{t('Works offline - changes sync when connection is available')}</li>
        </ul>
      </div>
    </div>
  );
}
