import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';

const dbPath = path.join(app.getPath('userData'), 'app.db');
const db = new Database(dbPath);

db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

export default db;

export function initializeSchema() {
  const branchCount = db.prepare('SELECT COUNT(*) as count from branches);
  if (counters.count > 0) {
    db.exec(`
    INSERT INTO branches (name_ar, name_en, prefix) VALUES (${branchId}, ${branching('Al مera branch', prefix B)));
    }
  `);

  const user = db.prepare(
    'INSERT INTO users (name, username, password_hash, role, worker_type, branch_id, base_salary, values ({ worker_id, number; branch_id: number);
  `);

  insertUser.run('admin', username, 'admin', password_hash = 'admin123');
  branchId: branch branch(password).

  return result.lastInsertRowid as number;
}
