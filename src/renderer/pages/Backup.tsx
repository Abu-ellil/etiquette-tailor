import React, { useState } from 'react';

// --- Mock state ---
const MOCK_LAST_BACKUP = 'October 24, 2023 — 14:32 PM';
const MOCK_STORAGE_USED_PCT = 42;
const MOCK_STORAGE_LABEL = '4.2 GB of 10.0 GB encrypted cloud storage';

interface BackupFile {
  name: string;
  date: string;
  size: string;
}

const MOCK_BACKUP_FILES: BackupFile[] = [
  { name: 'backup_2024-10-24_full.db', date: 'Oct 24, 2024', size: '4.2 GB' },
  { name: 'backup_2024-10-23_full.db', date: 'Oct 23, 2024', size: '4.1 GB' },
  { name: 'backup_2024-10-22_full.db', date: 'Oct 22, 2024', size: '4.1 GB' },
];

export default function BackupPage() {
  const [autoBackup, setAutoBackup] = useState(true);
  const [backingUp, setBackingUp] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleBackup = () => {
    setBackingUp(true);
    console.log('[Backup] Starting full backup...');
    // Placeholder — no IPC API yet
    setTimeout(() => {
      alert('Backup completed successfully.');
      setBackingUp(false);
    }, 1500);
  };

  const handleRestore = () => {
    setRestoring(true);
    console.log('[Backup] Opening restore file dialog...');
    setTimeout(() => {
      alert('Restore feature will be available once the backup IPC API is implemented.');
      setRestoring(false);
    }, 500);
  };

  const handleExport = () => {
    setExporting(true);
    console.log('[Backup] Exporting data...');
    setTimeout(() => {
      alert('Export feature will be available once the backup IPC API is implemented.');
      setExporting(false);
    }, 500);
  };

  return (
    <div className="pb-12">
      {/* Header */}
      <header className="mb-16">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-5xl font-headline font-extrabold text-on-surface tracking-tight mb-4">
              Security &amp; Backup
            </h2>
            <p className="text-lg text-secondary max-w-2xl leading-relaxed">
              Protect your studio's legacy. Manage database integrity, schedule cloud exports, and
              restore workshop history with surgical precision.
            </p>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-secondary mb-1">
              System Health
            </span>
            <div className="flex items-center gap-2 px-4 py-2 bg-tertiary-fixed text-on-tertiary-fixed rounded-full">
              <span className="w-2 h-2 rounded-full bg-on-tertiary-fixed animate-pulse" />
              <span className="text-xs font-bold">ALL SYSTEMS SECURE</span>
            </div>
          </div>
        </div>
      </header>

      {/* Last Backup Status Banner */}
      <section className="mb-12">
        <div className="relative overflow-hidden rounded-2xl bg-surface-container-low p-8 border-l-4 border-primary">
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 rounded-2xl bg-surface-container-lowest flex items-center justify-center shadow-sm">
                <span className="material-symbols-outlined text-primary text-3xl">cloud_done</span>
              </div>
              <div>
                <p className="text-sm text-secondary uppercase tracking-widest mb-1 font-semibold">
                  Last Backup Date
                </p>
                <h3 className="text-3xl font-headline font-bold text-on-surface">
                  {MOCK_LAST_BACKUP}
                </h3>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-secondary italic mb-1">Backup location:</p>
              <p className="font-bold text-on-surface">Secure Cloud (Encrypted)</p>
            </div>
          </div>
        </div>
      </section>

      {/* Action Cards Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
        {/* Backup Now */}
        <div className="group relative flex flex-col p-8 rounded-3xl bg-surface-container-lowest border-b-4 border-primary shadow-[0px_20px_40px_rgba(25,28,29,0.04)] hover:shadow-[0px_30px_60px_rgba(118,57,82,0.1)] transition-all duration-500">
          <div className="w-14 h-14 rounded-xl bg-primary-fixed flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <span
              className="material-symbols-outlined text-primary text-2xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              database
            </span>
          </div>
          <h4 className="text-2xl font-headline font-bold text-on-surface mb-3">Backup Data</h4>
          <p className="text-secondary leading-relaxed mb-8 flex-1">
            Generate a complete snapshot of all customers, measurements, and financial records. Files
            are optimized for secure storage.
          </p>
          <button
            onClick={handleBackup}
            disabled={backingUp}
            className="w-full py-4 bg-gradient-to-br from-primary to-primary-container text-white font-headline font-bold rounded-lg shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all disabled:opacity-60"
          >
            {backingUp ? 'Backing Up...' : 'Start Backup Now'}
          </button>
        </div>

        {/* Restore */}
        <div className="group relative flex flex-col p-8 rounded-3xl bg-surface-container-lowest border-b-4 border-secondary shadow-[0px_20px_40px_rgba(25,28,29,0.04)] hover:shadow-[0px_30px_60px_rgba(80,95,118,0.1)] transition-all duration-500">
          <div className="w-14 h-14 rounded-xl bg-secondary-container flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-secondary text-2xl">
              settings_backup_restore
            </span>
          </div>
          <h4 className="text-2xl font-headline font-bold text-on-surface mb-3">Restore Data</h4>
          <p className="text-secondary leading-relaxed mb-8 flex-1">
            Roll back your studio database to a previous state. Use this only if you encounter data
            corruption or hardware failure.
          </p>
          <button
            onClick={handleRestore}
            disabled={restoring}
            className="w-full py-4 bg-secondary text-white font-headline font-bold rounded-lg hover:opacity-90 active:scale-95 transition-all disabled:opacity-60"
          >
            {restoring ? 'Restoring...' : 'Upload Recovery File'}
          </button>
        </div>

        {/* Export */}
        <div className="group relative flex flex-col p-8 rounded-3xl bg-surface-container-lowest border-b-4 border-tertiary shadow-[0px_20px_40px_rgba(25,28,29,0.04)] hover:shadow-[0px_30px_60px_rgba(185,173,74,0.1)] transition-all duration-500">
          <div className="w-14 h-14 rounded-xl bg-tertiary-fixed flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-on-tertiary-fixed text-2xl">
              alternate_email
            </span>
          </div>
          <h4 className="text-2xl font-headline font-bold text-on-surface mb-3">Send to Email</h4>
          <p className="text-secondary leading-relaxed mb-8 flex-1">
            Receive an encrypted copy of your current database directly in your inbox for offline
            archival and peace of mind.
          </p>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="w-full py-4 bg-tertiary-fixed text-on-tertiary-fixed font-headline font-bold rounded-lg hover:opacity-90 active:scale-95 transition-all disabled:opacity-60"
          >
            {exporting ? 'Sending...' : 'Send Email Copy'}
          </button>
        </div>
      </section>

      {/* Settings Row: Auto-Backup & Storage */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
        {/* Auto Scheduling Toggle */}
        <div className="p-8 rounded-3xl bg-surface-container flex items-center justify-between">
          <div>
            <h5 className="font-headline font-bold text-on-surface text-xl mb-1">
              Automatic Scheduling
            </h5>
            <p className="text-sm text-secondary">Back up my data every 24 hours at midnight</p>
          </div>
          <button
            onClick={() => setAutoBackup((prev) => !prev)}
            className={`relative inline-flex h-7 w-14 items-center rounded-full p-1 transition-colors duration-300 ${
              autoBackup ? 'bg-primary' : 'bg-surface-container-highest'
            }`}
            aria-label="Toggle automatic backup"
          >
            <span
              className={`inline-block h-5 w-5 rounded-full bg-surface-container-lowest shadow-sm transition-transform duration-300 ${
                autoBackup ? 'translate-x-7' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Storage Quota */}
        <div className="p-8 rounded-3xl bg-surface-container flex items-center justify-between">
          <div>
            <h5 className="font-headline font-bold text-on-surface text-xl mb-1">Storage Quota</h5>
            <p className="text-sm text-secondary mb-4">{MOCK_STORAGE_LABEL}</p>
            <div className="w-64 h-2 bg-surface rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${MOCK_STORAGE_USED_PCT}%` }}
              />
            </div>
          </div>
          <span className="text-2xl font-bold text-primary">{MOCK_STORAGE_USED_PCT}%</span>
        </div>
      </section>

      {/* Backup File List */}
      <section className="bg-surface-container-lowest rounded-2xl overflow-hidden">
        <div className="p-8 border-b border-surface-container">
          <h3 className="font-headline font-bold text-2xl">Recent Backups</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>File Name</th>
                <th>Date</th>
                <th>Size</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_BACKUP_FILES.map((file, idx) => (
                <tr key={idx}>
                  <td>
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-primary text-lg">
                        database
                      </span>
                      <span className="font-semibold text-sm">{file.name}</span>
                    </div>
                  </td>
                  <td className="text-sm">{file.date}</td>
                  <td className="text-sm font-medium">{file.size}</td>
                  <td className="text-right">
                    <button
                      className="text-primary font-headline font-bold text-xs uppercase tracking-widest hover:underline"
                      onClick={() => alert(`Download of ${file.name} will be available once the backup IPC API is implemented.`)}
                    >
                      Download
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Footer Note */}
      <footer className="mt-16 text-center">
        <p className="text-sm text-secondary/60 font-medium">
          All backups are encrypted with AES-256 standards. Your data privacy is our highest priority
          at Etiquette Tailor.
        </p>
      </footer>
    </div>
  );
}
