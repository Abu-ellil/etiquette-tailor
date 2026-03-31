import db from './connection';

export interface Worker {
  id?: number;
  name: string;
  username: string;
  password_hash: string;
  role: 'admin' | 'manager' | 'reception' | 'worker';
  worker_type?: 'tailor' | 'master_cutter' | null;
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

export interface WorkerTaskView {
  task_id: number;
  order_id: number;
  order_number: string;
  piece_type: string;
  details?: string;
  task_type: string;
  status: string;
  assigned_to?: number;
  worker_name?: string;
  wage_type?: string;
  wage_rate?: number;
  wage_amount?: number;
  due_date?: string;
  customer_name?: string;
  started_at?: string;
  completed_at?: string;
  notes?: string;
  order_price?: number;
}

export function getWorkerTasks(userId: number): WorkerTaskView[] {
  const stmt = db.prepare(`
    SELECT
      ot.id as task_id,
      ot.order_id,
      o.order_number,
      o.piece_type,
      o.details,
      ot.task_type,
      ot.status,
      ot.assigned_to,
      u.name as worker_name,
      ot.wage_type,
      ot.wage_rate,
      ot.wage_amount,
      o.delivery_date as due_date,
      c.name as customer_name,
      ot.started_at,
      ot.completed_at,
      ot.notes,
      o.price as order_price
    FROM order_tasks ot
    JOIN orders o ON ot.order_id = o.id
    LEFT JOIN customers c ON o.customer_id = c.id
    LEFT JOIN users u ON ot.assigned_to = u.id
    WHERE ot.assigned_to = ?
    ORDER BY
      CASE ot.status
        WHEN 'in_progress' THEN 0
        WHEN 'pending' THEN 1
        WHEN 'done' THEN 2
      END,
      o.delivery_date ASC
  `);
  return stmt.all(userId) as WorkerTaskView[];
}

export interface MonthlyEarnings {
  task_count: number;
  piece_earnings: number;
  fixed_salary: number;
  total_earnings: number;
}

export function getMonthlyEarnings(userId: number, month: string): MonthlyEarnings {
  const startDate = `${month}-01`;
  const [y, m] = month.split('-').map(Number);
  const endDate = `${y}-${String(m).padStart(2, '0')}-${new Date(y, m, 0).getDate()}T23:59:59`;

  const earnings = db.prepare(`
    SELECT
      COUNT(*) as task_count,
      COALESCE(SUM(wage_amount), 0) as piece_earnings
    FROM order_tasks
    WHERE assigned_to = ? AND status = 'done'
      AND completed_at BETWEEN ? AND ?
  `).get(userId, startDate, endDate) as { task_count: number; piece_earnings: number };

  const worker = getWorker(userId);
  const fixedSalary = worker?.base_salary || 0;
  const pieceEarnings = earnings?.piece_earnings || 0;

  return {
    task_count: earnings?.task_count || 0,
    piece_earnings: pieceEarnings,
    fixed_salary: fixedSalary,
    total_earnings: pieceEarnings + fixedSalary,
  };
}

export interface WorkerOrderDetail {
  task_id: number;
  order_id: number;
  order_number: string;
  piece_type: string;
  price: number;
  task_type: string;
  wage_type: string;
  wage_rate: number;
  wage_amount: number;
  completed_at: string | null;
}

export function getWorkerOrderDetails(userId: number, startDate: string, endDate: string): WorkerOrderDetail[] {
  const stmt = db.prepare(`
    SELECT
      ot.id as task_id,
      ot.order_id,
      o.order_number,
      o.piece_type,
      o.price,
      ot.task_type,
      ot.wage_type,
      ot.wage_rate,
      ot.wage_amount,
      ot.completed_at
    FROM order_tasks ot
    JOIN orders o ON ot.order_id = o.id
    WHERE ot.assigned_to = ? AND ot.status = 'done'
      AND ot.completed_at BETWEEN ? AND ?
    ORDER BY ot.completed_at DESC
  `);
  return stmt.all(userId, startDate, endDate) as WorkerOrderDetail[];
}

export function recalculateTaskWages(orderId: number, newPrice: number): number {
  const tasks = db.prepare(
    'SELECT id, wage_type, wage_rate FROM order_tasks WHERE order_id = ? AND status != ?'
  ).all(orderId, 'done') as { id: number; wage_type: string; wage_rate: number }[];

  const update = db.prepare(
    'UPDATE order_tasks SET wage_amount = ? WHERE id = ?'
  );

  const txn = db.transaction(() => {
    let updated = 0;
    for (const task of tasks) {
      if (task.wage_type === 'fixed') continue;
      const newAmount = newPrice * (task.wage_rate / 100);
      update.run(newAmount, task.id);
      updated++;
    }
    return updated;
  });

  return txn();
}

// ── Worker Account / Payments ────────────────────────────────────────────

export interface WorkerPayment {
  id: number;
  user_id: number;
  amount: number;
  note: string | null;
  created_by: number | null;
  created_at: string;
}

export interface WorkerAccount {
  total_earnings: number;   // all-time piece earnings from completed tasks
  total_paid: number;       // all-time payments disbursed to worker
  balance: number;          // total_earnings - total_paid (what's owed)
  task_count: number;       // all-time completed task count
}

export function getWorkerAccount(userId: number): WorkerAccount {
  const earnings = db.prepare(`
    SELECT
      COALESCE(SUM(wage_amount), 0) as total_earnings,
      COUNT(*) as task_count
    FROM order_tasks
    WHERE assigned_to = ? AND status = 'done'
  `).get(userId) as { total_earnings: number; task_count: number };

  const paid = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total_paid
    FROM worker_payments
    WHERE user_id = ?
  `).get(userId) as { total_paid: number };

  const totalEarnings = earnings?.total_earnings || 0;
  const totalPaid = paid?.total_paid || 0;

  return {
    total_earnings: totalEarnings,
    total_paid: totalPaid,
    balance: totalEarnings - totalPaid,
    task_count: earnings?.task_count || 0,
  };
}

export function addWorkerPayment(userId: number, amount: number, note: string | null, createdBy: number | null): number {
  const stmt = db.prepare(
    'INSERT INTO worker_payments (user_id, amount, note, created_by) VALUES (?, ?, ?, ?)'
  );
  const result = stmt.run(userId, amount, note, createdBy);
  return result.lastInsertRowid as number;
}

export function getWorkerPayments(userId: number): WorkerPayment[] {
  const stmt = db.prepare(
    'SELECT * FROM worker_payments WHERE user_id = ? ORDER BY created_at DESC'
  );
  return stmt.all(userId) as WorkerPayment[];
}
