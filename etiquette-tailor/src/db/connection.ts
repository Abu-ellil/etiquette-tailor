import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'path';
import { app } from 'electron';

const dbPath = path.join(app.getPath('userData'), 'app.db');

let db: Database.Database;
let _initError: string | null = null;

try {
  db = new Database(dbPath);
  // Try integrity check first — if DB is corrupted, don't set WAL which can fail
  try {
    const check = db.pragma('integrity_check') as Array<{ integrity_check: string }>;
    const corrupted = check.some(r => r.integrity_check !== 'ok');
    if (corrupted) {
      // Try to recover by dumping and re-importing
      db.exec("SELECT * FROM sqlite_master");
      throw new Error('Database integrity check failed. Please restore from a backup.');
    }
  } catch (integrityErr: any) {
    _initError = integrityErr.message;
    try { db?.close?.(); } catch { /* ignore */ }
    db = {} as Database.Database;
    // Remove stale WAL/SHM files that may cause the corruption
    try { fs.unlinkSync(dbPath + '-wal'); } catch { /* ignore */ }
    try { fs.unlinkSync(dbPath + '-shm'); } catch { /* ignore */ }
    throw integrityErr;
  }
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');
} catch (err: any) {
  if (!_initError) _initError = err.message;
  db = {} as Database.Database;
}

export function isDbReady(): boolean {
  return _initError === null;
}

export function getInitError(): string | null {
  return _initError;
}

export function getDbPath(): string {
  return dbPath;
}

export function closeDb(): void {
  try { db?.close?.(); } catch { /* ignore */ }
}

export function checkIntegrity(): { ok: boolean; error?: string } {
  if (_initError) return { ok: false, error: _initError };
  try {
    const result = db.pragma('integrity_check') as Array<{ integrity_check: string }>;
    const failures = result.filter(r => r.integrity_check !== 'ok');
    if (failures.length > 0) {
      return { ok: false, error: failures.map(r => r.integrity_check).join('; ') };
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

export default db;
