import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from '../contexts/I18nContext';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface SyncStatus {
  lastExport: string | null;
  lastImport: string | null;
  syncFolderPath: string | null;
}

interface SyncResult {
  success: boolean;
  exportedAt?: string;
  importedAt?: string;
  counts?: Record<string, number>;
  error?: string;
}

interface ConflictData {
  type: 'customer' | 'order' | 'expense';
  local: any;
  remote: any;
  id: number;
}

interface MergeResult {
  success: boolean;
  merged?: number;
  conflicts?: ConflictData[];
  error?: string;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function SyncPage() {
  const { t } = useTranslation();
  const session = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('session') || '{}'); }
    catch { return {}; }
  }, []);

  const [folderPath, setFolderPath] = useState('');
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);
  const [resultType, setResultType] = useState<'export' | 'import' | 'merge' | null>(null);
  const [merging, setMerging] = useState(false);
  const [conflicts, setConflicts] = useState<ConflictData[]>([]);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [mergeResult, setMergeResult] = useState<MergeResult | null>(null);

  // Load status on mount
  useEffect(() => {
    loadStatus();
  }, []);

  async function loadStatus() {
    try {
      const s = await window.electronAPI.sync.getStatus();
      setStatus(s);
      if (s.syncFolderPath) {
        setFolderPath(s.syncFolderPath);
      }
    } catch (err) {
      console.error('Failed to load sync status:', err);
    }
  }

  async function saveFolderPath(path: string) {
    try {
      await window.electronAPI.settings.set({ sync_folder_path: path });
    } catch (err) {
      console.error('Failed to save folder path:', err);
    }
  }

  async function handleExport() {
    if (!folderPath.trim()) return;
    setExporting(true);
    setLastResult(null);
    setResultType('export');
    try {
      await saveFolderPath(folderPath.trim());
      const result = await window.electronAPI.sync.exportData(session.branch_id, folderPath.trim());
      setLastResult(result);
      await loadStatus();
    } catch (err: any) {
      setLastResult({ success: false, error: err.message });
    } finally {
      setExporting(false);
    }
  }

  async function handleImport() {
    if (!folderPath.trim()) return;
    setImporting(true);
    setLastResult(null);
    setResultType('import');
    try {
      await saveFolderPath(folderPath.trim());
      const result = await window.electronAPI.sync.importData(session.branch_id, folderPath.trim());
      setLastResult(result);
      await loadStatus();
    } catch (err: any) {
      setLastResult({ success: false, error: err.message });
    } finally {
      setImporting(false);
    }
  }

  async function handleMerge() {
    if (!folderPath.trim()) return;
    setMerging(true);
    setLastResult(null);
    setResultType('merge');
    try {
      await saveFolderPath(folderPath.trim());
      const result = await window.electronAPI.sync.mergeData(session.branch_id, folderPath.trim());
      
      if (result.conflicts && result.conflicts.length > 0) {
        setConflicts(result.conflicts);
        setShowConflictModal(true);
      }
      
      setMergeResult(result);
      await loadStatus();
    } catch (err: any) {
      setMergeResult({ success: false, error: err.message });
    } finally {
      setMerging(false);
    }
  }

  async function resolveConflict(conflict: ConflictData, keepLocal: boolean) {
    try {
      await window.electronAPI.sync.resolveConflict(
        session.branch_id,
        conflict.type,
        conflict.id,
        keepLocal ? 'local' : 'remote'
      );
      setConflicts(prev => prev.filter(c => c.id !== conflict.id || c.type !== conflict.type));
      
      if (conflicts.length === 1) {
        setShowConflictModal(false);
      }
    } catch (err: any) {
      console.error('Failed to resolve conflict:', err);
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

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-on-surface">{t('Branch Sync')}</h1>
        <p className="text-sm text-secondary mt-1">{t('Sync data between branches using a shared Google Drive folder')}</p>
      </div>

      {/* Folder Path Setting */}
      <div className="bg-surface-container-lowest rounded-2xl shadow-[0px_8px_24px_rgba(25,28,29,0.08)] p-5">
        <h2 className="text-base font-semibold text-on-surface mb-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">folder</span>
          {t('Google Drive Folder Path')}
        </h2>
        <p className="text-xs text-secondary mb-3">
          {t('Enter the path to a shared Google Drive folder. Both branches must use the same folder. Example: C:\\Users\\YourName\\Google Drive\\TailorSync')}
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={folderPath}
            onChange={(e) => setFolderPath(e.target.value)}
            onBlur={() => saveFolderPath(folderPath)}
            placeholder="C:\Users\...\Google Drive\TailorSync"
            className="flex-1 px-4 py-2.5 rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
          <button
            onClick={async () => {
              const selected = await window.electronAPI.sync.selectFolder();
              if (selected) {
                setFolderPath(selected);
                await saveFolderPath(selected);
              }
            }}
            className="px-4 py-2.5 rounded-xl bg-surface-container-high text-on-surface text-sm font-medium hover:bg-surface-container-high/80 flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">folder_open</span>
            {t('Browse')}
          </button>
        </div>
      </div>

      {/* Sync Status */}
      <div className="bg-surface-container-lowest rounded-2xl shadow-[0px_8px_24px_rgba(25,28,29,0.08)] p-5">
        <h2 className="text-base font-semibold text-on-surface mb-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">info</span>
          {t('Sync Status')}
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-surface-container-high rounded-xl p-3">
            <p className="text-xs text-secondary mb-1">{t('Last Export')}</p>
            <p className="text-sm font-semibold text-on-surface">{formatTimestamp(status?.lastExport || null)}</p>
          </div>
          <div className="bg-surface-container-high rounded-xl p-3">
            <p className="text-xs text-secondary mb-1">{t('Last Import')}</p>
            <p className="text-sm font-semibold text-on-surface">{formatTimestamp(status?.lastImport || null)}</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="bg-surface-container-lowest rounded-2xl shadow-[0px_8px_24px_rgba(25,28,29,0.08)] p-5">
        <h2 className="text-base font-semibold text-on-surface mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">sync</span>
          {t('Sync Actions')}
        </h2>
        <div className="flex gap-4">
          <button
            onClick={handleExport}
            disabled={exporting || !folderPath.trim()}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary text-on-primary font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting ? (
              <>
                <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                {t('Exporting...')}
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-lg">upload</span>
                {t('Export Branch Data')}
              </>
            )}
          </button>
          <button
            onClick={handleImport}
            disabled={importing || !folderPath.trim()}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-tertiary text-on-tertiary font-semibold text-sm hover:bg-tertiary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {importing ? (
              <>
                <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                {t('Importing...')}
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-lg">download</span>
                {t('Import Other Branch')}
              </>
            )}
          </button>
          <button
            onClick={handleMerge}
            disabled={merging || !folderPath.trim()}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-secondary text-on-secondary font-semibold text-sm hover:bg-secondary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {merging ? (
              <>
                <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                {t('Merging...')}
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-lg">merge</span>
                {t('Merge Both Branches')}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Result */}
      {lastResult && (
        <div className={`rounded-2xl shadow-[0px_8px_24px_rgba(25,28,29,0.08)] p-5 ${lastResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          {lastResult.success ? (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-green-600">check_circle</span>
                <h3 className="text-sm font-semibold text-green-800">
                  {resultType === 'export' ? t('Export Successful') : resultType === 'merge' ? t('Merge Successful') : t('Import Successful')}
                </h3>
              </div>
              {lastResult.counts && (
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(lastResult.counts).map(([key, value]) => (
                    <div key={key} className="bg-white rounded-lg p-2 text-center">
                      <p className="text-lg font-bold text-green-700">{value as number}</p>
                      <p className="text-xs text-secondary capitalize">{key.replace(/_/g, ' ')}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined text-red-600 mt-0.5">error</span>
              <div>
                <h3 className="text-sm font-semibold text-red-800">
                  {resultType === 'export' ? t('Export Failed') : resultType === 'merge' ? t('Merge Failed') : t('Import Failed')}
                </h3>
                <p className="text-xs text-red-600 mt-1">{lastResult.error}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Merge Result */}
      {mergeResult && !lastResult && (
        <div className={`rounded-2xl shadow-[0px_8px_24px_rgba(25,28,29,0.08)] p-5 ${mergeResult.success ? 'bg-blue-50 border border-blue-200' : 'bg-red-50 border border-red-200'}`}>
          {mergeResult.success ? (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-blue-600">merge</span>
                <h3 className="text-sm font-semibold text-blue-800">{t('Merge Complete')}</h3>
              </div>
              <p className="text-sm text-blue-700">
                {t('Total merged')}: {mergeResult.merged}
              </p>
              {mergeResult.conflicts && mergeResult.conflicts.length > 0 && (
                <p className="text-sm text-orange-600 mt-2">
                  {t('Conflicts detected')}: {mergeResult.conflicts.length}
                </p>
              )}
            </div>
          ) : (
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined text-red-600 mt-0.5">error</span>
              <div>
                <h3 className="text-sm font-semibold text-red-800">{t('Merge Failed')}</h3>
                <p className="text-xs text-red-600 mt-1">{mergeResult.error}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Conflict Resolution Modal */}
      {showConflictModal && conflicts.length > 0 && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container-high rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-5 border-b border-outline-variant">
              <h2 className="text-lg font-semibold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-orange-500">warning</span>
                {t('Resolve Conflicts')} ({conflicts.length})
              </h2>
            </div>
            <div className="p-5 overflow-y-auto max-h-[60vh] space-y-4">
              {conflicts.slice(0, 5).map((conflict, idx) => (
                <div key={`${conflict.type}-${conflict.id}-${idx}`} className="bg-surface-container-lowest rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="material-symbols-outlined text-orange-500 text-lg">swap_horiz</span>
                    <span className="text-sm font-semibold text-on-surface capitalize">{conflict.type}</span>
                    <span className="text-xs text-secondary">#{conflict.id}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-surface-container-high rounded-lg p-3">
                      <p className="text-xs text-secondary mb-2">{t('Local (This Branch)')}</p>
                      <p className="text-sm text-on-surface">
                        {conflict.local?.name || conflict.local?.order_number || conflict.local?.description || JSON.stringify(conflict.local).slice(0, 50)}
                      </p>
                      <p className="text-xs text-secondary mt-1">
                        {t('Updated')}: {conflict.local?.updated_at || conflict.local?.created_at || '-'}
                      </p>
                    </div>
                    <div className="bg-surface-container-high rounded-lg p-3">
                      <p className="text-xs text-secondary mb-2">{t('Remote (Other Branch)')}</p>
                      <p className="text-sm text-on-surface">
                        {conflict.remote?.name || conflict.remote?.order_number || conflict.remote?.description || JSON.stringify(conflict.remote).slice(0, 50)}
                      </p>
                      <p className="text-xs text-secondary mt-1">
                        {t('Updated')}: {conflict.remote?.updated_at || conflict.remote?.created_at || '-'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={() => resolveConflict(conflict, true)}
                      className="flex-1 px-4 py-2 rounded-lg bg-primary text-on-primary text-sm font-medium hover:bg-primary/90"
                    >
                      {t('Keep Local')}
                    </button>
                    <button
                      onClick={() => resolveConflict(conflict, false)}
                      className="flex-1 px-4 py-2 rounded-lg bg-tertiary text-on-tertiary text-sm font-medium hover:bg-tertiary/90"
                    >
                      {t('Keep Remote')}
                    </button>
                  </div>
                </div>
              ))}
              {conflicts.length > 5 && (
                <p className="text-sm text-secondary text-center">
                  {t('And')} {conflicts.length - 5} {t('more conflicts...')}
                </p>
              )}
            </div>
            <div className="p-5 border-t border-outline-variant flex justify-end">
              <button
                onClick={() => {
                  setShowConflictModal(false);
                  setConflicts([]);
                }}
                className="px-5 py-2 rounded-lg bg-surface-container-high text-on-surface text-sm font-medium hover:bg-surface-container-high/80"
              >
                {t('Cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-surface-container-lowest rounded-2xl shadow-[0px_8px_24px_rgba(25,28,29,0.08)] p-5">
        <h2 className="text-base font-semibold text-on-surface mb-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">help</span>
          {t('How to Set Up')}
        </h2>
        <ol className="text-sm text-secondary space-y-2 list-decimal list-inside">
          <li>{t('Install Google Drive Desktop on both computers')}</li>
          <li>{t('Create a shared folder in Google Drive (e.g., "TailorSync")')}</li>
          <li>{t('Enter the local path of that folder above on BOTH computers')}</li>
          <li>{t('Click "Export" on this branch to send your data')}</li>
          <li>{t('On the other branch, click "Import" to receive the data')}</li>
          <li>{t('Repeat: Export on the other branch, then Import here')}</li>
        </ol>
        <div className="mt-3 p-3 bg-yellow-50 rounded-xl border border-yellow-200">
          <p className="text-xs text-yellow-800">
            <strong>{t('Important')}:</strong> {t('Each branch exports its own data. Import reads the OTHER branch\'s data file. Sync is one-way per operation — always Export from source, then Import on destination.')}
          </p>
        </div>
      </div>
    </div>
  );
}
