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
  const [resultType, setResultType] = useState<'export' | 'import' | null>(null);

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
        <input
          type="text"
          value={folderPath}
          onChange={(e) => setFolderPath(e.target.value)}
          onBlur={() => saveFolderPath(folderPath)}
          placeholder="C:\Users\...\Google Drive\TailorSync"
          className="w-full px-4 py-2.5 rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        />
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
                  {resultType === 'export' ? t('Export Successful') : t('Import Successful')}
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
                  {resultType === 'export' ? t('Export Failed') : t('Import Failed')}
                </h3>
                <p className="text-xs text-red-600 mt-1">{lastResult.error}</p>
              </div>
            </div>
          )}
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
