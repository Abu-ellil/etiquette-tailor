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
