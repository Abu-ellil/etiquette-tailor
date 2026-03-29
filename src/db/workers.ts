import db from './connection';

export interface Worker {
  id?: number;
  name: string;
  branch: 'A' | 'B';
  wage_type: 'percentage' | 'fixed';
  wage_rate: number;
  is_deleted?: number;
  created_at?: string;
  updated_at?: string;
}

export function getAllWorkers(): Worker[] {
  const stmt = db.prepare('SELECT * FROM workers WHERE is_deleted = 0 ORDER BY created_at DESC');
  return stmt.all() as Worker[];
}

export function getWorker(id: number): Worker | undefined {
  const stmt = db.prepare('SELECT * FROM workers WHERE id = ? AND is_deleted = 0');
  return stmt.get(id) as Worker | undefined;
}

export function createWorker(worker: Worker): number {
  const stmt = db.prepare(`
    INSERT INTO workers (name, branch, wage_type, wage_rate)
    VALUES (?, ?, ?, ?)
  `);
  const result = stmt.run(worker.name, worker.branch, worker.wage_type, worker.wage_rate);
  return result.lastInsertRowid as number;
}

export function updateWorker(id: number, worker: Partial<Worker>): void {
  const stmt = db.prepare(`
    UPDATE workers
    SET name = ?, branch = ?, wage_type = ?, wage_rate = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND is_deleted = 0
  `);
  stmt.run(worker.name, worker.branch, worker.wage_type, worker.wage_rate, id);
}

export function deleteWorker(id: number): void {
  const stmt = db.prepare('UPDATE workers SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
  stmt.run(id);
}
