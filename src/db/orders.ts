import db from './connection';

export interface Order {
  id?: number;
  order_number: string;
  branch_id: number;
  customer_id: number;
  piece_type: string;
  details?: string;
  price: number;
  paid: number;
  balance: number;
  payment_method: 'cash' | 'card';
  status: 'intake' | 'cutting' | 'sewing' | 'ready' | 'delivered';
  receive_date?: string;
  delivery_date?: string;
  created_by?: number;
  created_at?: string;
  customer_name?: string;
  customer_phone?: string;
}

export interface OrderMeasurement {
  id?: number;
  order_id: number;
  chest?: number;
  waist?: number;
  hips?: number;
  length?: number;
  sleeve?: number;
  shoulder?: number;
  notes?: string;
  taken_by?: number;
  created_at?: string;
}

export interface OrderTask {
  id?: number;
  order_id: number;
  task_type: 'cutting' | 'sewing' | 'design';
  assigned_to?: number;
  wage_type: 'percentage' | 'fixed';
  wage_rate: number;
  wage_amount: number;
  status: 'pending' | 'in_progress' | 'done';
  started_at?: string;
  completed_at?: string;
  notes?: string;
  worker_name?: string;
}

function generateOrderNumber(branchId: number): string {
  const branch = db.prepare('SELECT prefix, last_sequence FROM branches WHERE id = ?').get(branchId) as { prefix: string; last_sequence: number };
  if (!branch) throw new Error('Branch not found');

  const nextSeq = branch.last_sequence + 1;

  const updateSeq = db.prepare('UPDATE branches SET last_sequence = ? WHERE id = ?');
  updateSeq.run(nextSeq, branchId);

  return `${branch.prefix}-${String(nextSeq).padStart(3, '0')}`;
}

export function getAllOrders(branchId?: number, status?: string): Order[] {
  let query = `
    SELECT o.*, c.name as customer_name, c.phone as customer_phone
    FROM orders o
    LEFT JOIN customers c ON o.customer_id = c.id
  WHERE 1=1
  `;
  const params: any[] = [];

  if (branchId) {
    query += ' AND o.branch_id = ?';
    params.push(branchId);
  }
  if (status) {
    query += ' AND o.status = ?';
    params.push(status);
  }
  query += ' ORDER BY o.created_at DESC';

  const stmt = db.prepare(query);
  return stmt.all(...params) as Order[];
}

export function getOrder(id: number): Order | undefined {
  const stmt = db.prepare(`
    SELECT o.*, c.name as customer_name, c.phone as customer_phone
    FROM orders o
    LEFT JOIN customers c ON o.customer_id = c.id
    WHERE o.id = ?
  `);
  return stmt.get(id) as Order | undefined;
}

export function getOrderByNumber(orderNumber: string): Order | undefined {
  const stmt = db.prepare(`
    SELECT o.*, c.name as customer_name, c.phone as customer_phone
    FROM orders o
    LEFT JOIN customers c ON o.customer_id = c.id
    WHERE o.order_number = ?
  `);
  return stmt.get(orderNumber) as Order | undefined;
}

export function createOrder(order: Omit<Order, 'id' | 'balance'>, measurements?: OrderMeasurement): number {
  const transaction = db.transaction(() => {
    const orderNumber = generateOrderNumber(order.branch_id);

    const orderStmt = db.prepare(`
      INSERT INTO orders (
        order_number, branch_id, customer_id, piece_type, details,
        price, paid, payment_method, status, receive_date, delivery_date, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = orderStmt.run(
      orderNumber,
      order.branch_id,
      order.customer_id,
      order.piece_type,
      order.details || null,
      order.price,
      order.paid || 0,
      order.payment_method,
      order.status || 'intake',
      order.receive_date || null,
      order.delivery_date || null,
      order.created_by || null
    );

    const orderId = result.lastInsertRowid as number;

    if (measurements) {
      const measStmt = db.prepare(`
        INSERT INTO order_measurements (order_id, chest, waist, hips, length, sleeve, shoulder, notes, taken_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      measStmt.run(
        orderId,
        measurements.chest || null,
        measurements.waist || null,
        measurements.hips || null,
        measurements.length || null,
        measurements.sleeve || null,
        measurements.shoulder || null,
        measurements.notes || null,
        measurements.taken_by || null
      );
    }

    return orderId;
  });

  return transaction();
}

export function updateOrder(id: number, order: Partial<Order>): void {
  const stmt = db.prepare(`
    UPDATE orders SET
      customer_id = ?, piece_type = ?, details = ?,
      price = ?, paid = ?, payment_method = ?,
      status = ?, delivery_date = ?
    WHERE id = ?
  `);
  stmt.run(
    order.customer_id,
    order.piece_type,
    order.details || null,
    order.price,
    order.paid || 0,
    order.payment_method,
    order.status,
    order.delivery_date || null,
    id
  );
}

export function updateOrderStatus(id: number, status: string): void {
  if (status === 'delivered') {
    const order = db.prepare('SELECT price, paid FROM orders WHERE id = ?').get(id) as { price: number; paid: number } | undefined;
    if (!order) throw new Error('Order not found');
    if (order.paid < order.price) {
      throw new Error(`Cannot deliver: balance outstanding (${(order.price - order.paid).toFixed(2)} QAR remaining)`);
    }
  }
  const stmt = db.prepare('UPDATE orders SET status = ? WHERE id = ?');
  stmt.run(status, id);
}

export function deleteOrder(id: number): void {
  const stmt = db.prepare('DELETE FROM orders WHERE id = ?');
  stmt.run(id);
}

export function getOrderMeasurements(orderId: number): OrderMeasurement | undefined {
  const stmt = db.prepare('SELECT * FROM order_measurements WHERE order_id = ?');
  return stmt.get(orderId) as OrderMeasurement | undefined;
}

export function updateOrderMeasurements(orderId: number, measurements: Partial<OrderMeasurement>): void {
  const stmt = db.prepare(`
    UPDATE order_measurements SET
      chest = ?, waist = ?, hips = ?, length = ?,
      sleeve = ?, shoulder = ?, notes = ?
    WHERE order_id = ?
  `);
  stmt.run(
    measurements.chest || null,
    measurements.waist || null,
    measurements.hips || null,
    measurements.length || null,
    measurements.sleeve || null,
    measurements.shoulder || null,
    measurements.notes || null,
    orderId
  );
}

export function getOrderTasks(orderId: number): OrderTask[] {
  const stmt = db.prepare(`
    SELECT ot.*, u.name as worker_name
    FROM order_tasks ot
    LEFT JOIN users u ON ot.assigned_to = u.id
    WHERE ot.order_id = ?
    ORDER BY ot.task_type
  `);
  return stmt.all(orderId) as OrderTask[];
}

export function createOrderTask(task: Omit<OrderTask, 'id'>): number {
  const stmt = db.prepare(`
    INSERT INTO order_tasks (order_id, task_type, assigned_to, wage_type, wage_rate, wage_amount, status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    task.order_id,
    task.task_type,
    task.assigned_to || null,
    task.wage_type,
    task.wage_rate,
    task.wage_amount,
    task.status || 'pending',
    task.notes || null
  );
  return result.lastInsertRowid as number;
}

export function updateTaskStatus(taskId: number, status: string): void {
  const now = new Date().toISOString();
  if (status === 'in_progress') {
    const stmt = db.prepare('UPDATE order_tasks SET status = ?, started_at = ? WHERE id = ?');
    stmt.run(status, now, taskId);
  } else if (status === 'done') {
    const stmt = db.prepare('UPDATE order_tasks SET status = ?, completed_at = ? WHERE id = ?');
    stmt.run(status, now, taskId);
  } else {
    const stmt = db.prepare('UPDATE order_tasks SET status = ? WHERE id = ?');
    stmt.run(status, taskId);
  }
}

export function reassignTask(taskId: number, newUserId: number, wageType: string, wageRate: number, wageAmount: number): void {
  const stmt = db.prepare(`
    UPDATE order_tasks SET assigned_to = ?, wage_type = ?, wage_rate = ?, wage_amount = ?, status = 'pending', started_at = NULL, completed_at = NULL
    WHERE id = ?
  `);
  stmt.run(newUserId, wageType, wageRate, wageAmount, taskId);
}

export function searchOrders(query: string, branchId?: number): Order[] {
  const searchTerm = `%${query}%`;
  let sql = `
    SELECT o.*, c.name as customer_name, c.phone as customer_phone
    FROM orders o
    LEFT JOIN customers c ON o.customer_id = c.id
    WHERE (o.order_number LIKE ? OR c.name LIKE ? OR c.phone LIKE ?)
  `;
  const params: any[] = [searchTerm, searchTerm, searchTerm];

  if (branchId) {
    sql += ' AND o.branch_id = ?';
    params.push(branchId);
  }
  sql += ' ORDER BY o.created_at DESC';

  const stmt = db.prepare(sql);
  return stmt.all(...params) as Order[];
}

export interface TaskBoardItem {
  task_id: number;
  order_id: number;
  order_number: string;
  customer_name: string;
  piece_type: string;
  details?: string;
  task_type: string;
  assigned_to?: number;
  worker_name?: string;
  wage_type?: string;
  wage_rate?: number;
  wage_amount?: number;
  status: string;
  started_at?: string;
  completed_at?: string;
  due_date?: string;
  branch_id: number;
  order_price?: number;
  order_status?: string;
  notes?: string;
}

export function getAllTasks(filters?: { branchId?: number; workerId?: number; taskType?: string }): TaskBoardItem[] {
  let query = `
    SELECT
      ot.id as task_id,
      ot.order_id,
      o.order_number,
      c.name as customer_name,
      o.piece_type,
      o.details,
      ot.task_type,
      ot.assigned_to,
      u.name as worker_name,
      ot.wage_type,
      ot.wage_rate,
      ot.wage_amount,
      ot.status,
      ot.started_at,
      ot.completed_at,
      o.delivery_date as due_date,
      o.branch_id,
      o.price as order_price,
      o.status as order_status,
      ot.notes
    FROM order_tasks ot
    JOIN orders o ON ot.order_id = o.id
    LEFT JOIN customers c ON o.customer_id = c.id
    LEFT JOIN users u ON ot.assigned_to = u.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (filters?.branchId) {
    query += ' AND o.branch_id = ?';
    params.push(filters.branchId);
  }
  if (filters?.workerId) {
    query += ' AND ot.assigned_to = ?';
    params.push(filters.workerId);
  }
  if (filters?.taskType) {
    query += ' AND ot.task_type = ?';
    params.push(filters.taskType);
  }

  query += ` ORDER BY
    CASE ot.status
      WHEN 'in_progress' THEN 0
      WHEN 'pending' THEN 1
      WHEN 'done' THEN 2
    END,
    o.delivery_date ASC
  `;

  const stmt = db.prepare(query);
  return stmt.all(...params) as TaskBoardItem[];
}

export function getOrderStats(branchId?: number): { total: number; in_progress: number; ready: number; delivered: number; overdue: number; revenue: number } {
  let branchFilter = '';
  const params: any[] = [];

  if (branchId) {
    branchFilter = ' AND branch_id = ?';
    params.push(branchId);
  }

  const today = new Date().toISOString().split('T')[0];

  const stmt = db.prepare(`
    SELECT
      COUNT(*) as total,
      COALESCE(SUM(CASE WHEN status IN ('intake','cutting','sewing') THEN 1 ELSE 0 END), 0) as in_progress,
      COALESCE(SUM(CASE WHEN status = 'ready' THEN 1 ELSE 0 END), 0) as ready,
      COALESCE(SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END), 0) as delivered,
      COALESCE(SUM(CASE WHEN status != 'delivered' AND delivery_date < ? THEN 1 ELSE 0 END), 0) as overdue,
      COALESCE(SUM(CASE WHEN status != 'delivered' THEN price ELSE 0 END), 0) as revenue
    FROM orders
    WHERE 1=1 ${branchFilter}
  `);
  return stmt.get(today, ...params) as { total: number; in_progress: number; ready: number; delivered: number; overdue: number; revenue: number };
}

export interface ReportStats {
  totalOrders: number;
  revenue: number;
  workersCost: number;
  netProfit: number;
}

function getPeriodDateFilter(period?: string): { filter: string; params: any[] } {
  if (!period || period === 'monthly') {
    return { filter: " AND created_at >= date('now', 'start of month')", params: [] };
  }
  if (period === 'daily') {
    return { filter: " AND date(created_at) = date('now')", params: [] };
  }
  if (period === 'weekly') {
    return { filter: " AND created_at >= date('now', '-7 days')", params: [] };
  }
  return { filter: '', params: [] };
}

export function getReportStats(branchId?: number, period?: string): ReportStats {
  let branchFilter = '';
  const params: any[] = [];

  if (branchId) {
    branchFilter = ' AND branch_id = ?';
    params.push(branchId);
  }

  const { filter: dateFilter } = getPeriodDateFilter(period);

  const stmt = db.prepare(`
    SELECT
      COUNT(*) as totalOrders,
      COALESCE(SUM(price), 0) as revenue
    FROM orders
    WHERE 1=1 ${branchFilter}${dateFilter}
  `);
  const orderStats = stmt.get(...params) as { totalOrders: number; revenue: number };

  // Workers cost = sum of all task wages
  let costFilter = '';
  const costParams: any[] = [];
  if (branchId) {
    costFilter = ' AND o.branch_id = ?';
    costParams.push(branchId);
  }

  const costDateFilter = dateFilter.replace(/created_at/g, 'o.created_at');

  const costStmt = db.prepare(`
    SELECT COALESCE(SUM(ot.wage_amount), 0) as workersCost
    FROM order_tasks ot
    JOIN orders o ON ot.order_id = o.id
    WHERE 1=1 ${costFilter}${costDateFilter}
  `);
  const costResult = costStmt.get(...costParams) as { workersCost: number };

  return {
    totalOrders: orderStats.totalOrders,
    revenue: orderStats.revenue,
    workersCost: costResult.workersCost,
    netProfit: orderStats.revenue - costResult.workersCost,
  };
}

export interface PaymentSplit {
  card: number;
  cash: number;
  cardAmount: number;
  cashAmount: number;
}

export function getPaymentSplit(branchId?: number, period?: string): PaymentSplit {
  let branchFilter = '';
  const params: any[] = [];

  if (branchId) {
    branchFilter = ' AND branch_id = ?';
    params.push(branchId);
  }

  const { filter: dateFilter } = getPeriodDateFilter(period);

  const stmt = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN payment_method = 'card' THEN price ELSE 0 END), 0) as cardAmount,
      COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN price ELSE 0 END), 0) as cashAmount,
      COUNT(*) as total
    FROM orders
    WHERE 1=1 ${branchFilter}${dateFilter}
  `);
  const result = stmt.get(...params) as { cardAmount: number; cashAmount: number; total: number };

  const total = result.cardAmount + result.cashAmount;
  return {
    card: total > 0 ? Math.round((result.cardAmount / total) * 100) : 0,
    cash: total > 0 ? Math.round((result.cashAmount / total) * 100) : 0,
    cardAmount: result.cardAmount,
    cashAmount: result.cashAmount,
  };
}

export interface MonthlyRevenue {
  month: string;
  value: number;
}

export function getMonthlyRevenue(months: number = 6, branchId?: number): MonthlyRevenue[] {
  let branchFilter = '';
  const params: any[] = [];

  if (branchId) {
    branchFilter = ' AND branch_id = ?';
    params.push(branchId);
  }

  const stmt = db.prepare(`
    SELECT
      strftime('%Y-%m', created_at) as month_key,
      COALESCE(SUM(price), 0) as value
    FROM orders
    WHERE created_at >= date('now', '-${months} months') ${branchFilter}
    GROUP BY strftime('%Y-%m', created_at)
    ORDER BY month_key ASC
  `);
  const rows = stmt.all(...params) as { month_key: string; value: number }[];

  return rows.map((r) => {
    const d = new Date(r.month_key + '-01');
    const monthLabel = d.toLocaleDateString('en', { month: 'short' });
    return { month: monthLabel, value: r.value };
  });
}

export function getRecentOrders(limit: number = 10, branchId?: number, period?: string): any[] {
  let branchFilter = '';
  const params: any[] = [];

  if (branchId) {
    branchFilter = ' AND o.branch_id = ?';
    params.push(branchId);
  }

  const { filter: dateFilter } = getPeriodDateFilter(period);
  const orderDateFilter = dateFilter.replace(/created_at/g, 'o.created_at');

  const stmt = db.prepare(`
    SELECT o.*, c.name as customer_name
    FROM orders o
    LEFT JOIN customers c ON o.customer_id = c.id
    WHERE 1=1 ${branchFilter}${orderDateFilter}
    ORDER BY o.created_at DESC
    LIMIT ?
  `);

  params.push(limit);
  return (stmt as any).all(...params) as any[];
}

// ── Order Payments ──────────────────────────────────────────────────

export interface OrderPayment {
  id: number;
  order_id: number;
  amount: number;
  method: 'cash' | 'card';
  note: string | null;
  created_by: number | null;
  created_at: string;
}

export function addOrderPayment(orderId: number, amount: number, method: 'cash' | 'card', note: string | null, createdBy: number | null): number {
  const txn = db.transaction(() => {
    const insertStmt = db.prepare(
      'INSERT INTO order_payments (order_id, amount, method, note, created_by) VALUES (?, ?, ?, ?, ?)'
    );
    const result = insertStmt.run(orderId, amount, method, note, createdBy);

    // Recalculate total paid from all payment records
    const sumRow = db.prepare(
      'SELECT COALESCE(SUM(amount), 0) as total FROM order_payments WHERE order_id = ?'
    ).get(orderId) as { total: number };

    db.prepare('UPDATE orders SET paid = ? WHERE id = ?').run(sumRow.total, orderId);

    return result.lastInsertRowid as number;
  });

  return txn();
}

export function getOrderPayments(orderId: number): OrderPayment[] {
  const stmt = db.prepare(
    'SELECT * FROM order_payments WHERE order_id = ? ORDER BY created_at ASC'
  );
  return stmt.all(orderId) as OrderPayment[];
}

export function deleteOrderPayment(paymentId: number): void {
  const txn = db.transaction(() => {
    const payment = db.prepare('SELECT order_id FROM order_payments WHERE id = ?').get(paymentId) as { order_id: number } | undefined;
    if (!payment) return;

    db.prepare('DELETE FROM order_payments WHERE id = ?').run(paymentId);

    // Recalculate total paid
    const sumRow = db.prepare(
      'SELECT COALESCE(SUM(amount), 0) as total FROM order_payments WHERE order_id = ?'
    ).get(payment.order_id) as { total: number };

    db.prepare('UPDATE orders SET paid = ? WHERE id = ?').run(sumRow.total, payment.order_id);
  });

  txn();
}
