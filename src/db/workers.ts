import db from './connection';

export interface Worker {
  id?: number;
  name: string;
  username: string;
  password_hash: string;
  role: 'admin' | 'manager' | 'reception' | 'worker';
  worker_type?: 'tailor' | 'cutter' | 'designer' | null;
  branch_id: number;
  base_salary: number;
  active: number;
  created_at?: string;
}

export interface WorkerRate {
  id?: number;
  user_id: number;
  piece_type: string;
  wage_type: 'percentage' | 'fixed';
  rate: number;
  season_start?: string;
  season_end?: string;
  created_at?: string;
}

export function getAllWorkers(branchId?: number): Worker[] {
  if (branchId) {
    const stmt = db.prepare(
      'SELECT * FROM users WHERE role = ? AND branch_id = ? AND active = 1 ORDER BY name'
    );
    return stmt.all('worker', branchId) as Worker[];
  }
  const stmt = db.prepare('SELECT * FROM users WHERE role = ? AND active = 1 ORDER BY name');
  return stmt.all('worker') as Worker[];
}

export function getWorker(id: number): Worker | undefined {
  const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
  return stmt.get(id) as Worker | undefined;
}

export function createWorker(worker: Omit<Worker, 'id'>): number {
  const stmt = db.prepare(`
    INSERT INTO users (name, username, password_hash, role, worker_type, branch_id, base_salary)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    worker.name,
    worker.username,
    worker.password_hash,
    'worker',
    worker.worker_type || null,
    worker.branch_id,
    worker.base_salary || 0
  );
  return result.lastInsertRowid as number;
}

export function updateWorker(id: number, worker: Partial<Worker>): void {
  const stmt = db.prepare(`
    UPDATE users SET name = ?, worker_type = ?, branch_id = ?, base_salary = ?
    WHERE id = ?
  `);
  stmt.run(worker.name, worker.worker_type || null, worker.branch_id, worker.base_salary || 0, id);
}

export function deactivateWorker(id: number): void {
  const stmt = db.prepare('UPDATE users SET active = 0 WHERE id = ?');
  stmt.run(id);
}

export function getWorkerRates(userId: number): WorkerRate[] {
  const stmt = db.prepare('SELECT * FROM worker_rates WHERE user_id = ? ORDER BY piece_type');
  return stmt.all(userId) as WorkerRate[];
}

export function setWorkerRate(rate: Omit<WorkerRate, 'id'>): number {
  const existing = db.prepare(
    'SELECT id FROM worker_rates WHERE user_id = ? AND piece_type = ? AND (season_start IS NULL OR season_start = ?)'
  ).get(rate.user_id, rate.piece_type, rate.season_start || null) as { id: number } | undefined;

  if (existing) {
    const stmt = db.prepare('UPDATE worker_rates SET wage_type = ?, rate = ?, season_start = ?, season_end = ? WHERE id = ?');
    stmt.run(rate.wage_type, rate.rate, rate.season_start || null, rate.season_end || null, existing.id);
    return existing.id;
  }

  const stmt = db.prepare(`
    INSERT INTO worker_rates (user_id, piece_type, wage_type, rate, season_start, season_end)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(rate.user_id, rate.piece_type, rate.wage_type, rate.rate, rate.season_start || null, rate.season_end || null);
  return result.lastInsertRowid as number;
}

export function getActiveRate(userId: number, pieceType: string): WorkerRate | undefined {
  const today = new Date().toISOString().split('T')[0];

  const seasonal = db.prepare(`
    SELECT * FROM worker_rates
    WHERE user_id = ? AND piece_type = ?
      AND season_start <= ? AND season_end >= ?
    ORDER BY created_at DESC LIMIT 1
  `).get(userId, pieceType, today, today) as WorkerRate | undefined;

  if (seasonal) return seasonal;

  const standard = db.prepare(`
    SELECT * FROM worker_rates
    WHERE user_id = ? AND piece_type = ? AND season_start IS NULL
    ORDER BY created_at DESC LIMIT 1
  `).get(userId, pieceType) as WorkerRate | undefined;

  return standard;
}

export function calculateWage(price: number, wageType: string, rate: number): number {
  if (wageType === 'percentage') {
    return price * (rate / 100);
  }
  return rate;
}

export function getWorkerEarnings(userId: number, startDate: string, endDate: string): { task_count: number; total_earnings: number; tasks_by_type: string } {
  const stmt = db.prepare(`
    SELECT
      COUNT(*) as task_count,
      SUM(wage_amount) as total_earnings
    FROM order_tasks
    WHERE assigned_to = ? AND status = 'done'
      AND completed_at BETWEEN ? AND ?
  `);
  return stmt.get(userId, startDate, endDate) as { task_count: number; total_earnings: number; tasks_by_type: string };
}
