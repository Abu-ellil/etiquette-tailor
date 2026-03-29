import db from './connection';

export interface Order {
  id?: number;
  order_number: string;
  customer_id: number;
  worker_id: number;
  piece_type: string;
  measurements_id?: number;
  price: number;
  paid?: number;
  balance?: number;
  due_date: string;
  status?: 'In Progress' | 'Ready' | 'Delivered';
  payment_type: 'Cash' | 'Card';
  branch: 'A' | 'B';
  notes?: string;
  is_deleted?: number;
  created_at?: string;
  updated_at?: string;
}

// Generate order number with branch prefix
function generateOrderNumber(branch: 'A' | 'B'): string {
  const stmt = db.prepare('UPDATE order_counters SET counter = counter + 1 WHERE branch = ?');
  stmt.run(branch);

  const counterStmt = db.prepare('SELECT counter FROM order_counters WHERE branch = ?');
  const result = counterStmt.get(branch) as { counter: number };

  return `${branch}-${String(result.counter).padStart(3, '0')}`;
}

export function getAllOrders(): Order[] {
  const stmt = db.prepare(`
    SELECT o.*,
           c.name as customer_name,
           w.name as worker_name
    FROM orders o
    LEFT JOIN customers c ON o.customer_id = c.id
    LEFT JOIN workers w ON o.worker_id = w.id
    WHERE o.is_deleted = 0
    ORDER BY o.created_at DESC
  `);
  return stmt.all() as Order[];
}

export function getOrder(id: number): Order | undefined {
  const stmt = db.prepare(`
    SELECT o.*,
           c.name as customer_name,
           w.name as worker_name
    FROM orders o
    LEFT JOIN customers c ON o.customer_id = c.id
    LEFT JOIN workers w ON o.worker_id = w.id
    WHERE o.id = ? AND o.is_deleted = 0
  `);
  return stmt.get(id) as Order | undefined;
}

export function createOrder(order: Order): number {
  const orderNumber = generateOrderNumber(order.branch);

  const transaction = db.transaction(() => {
    const stmt = db.prepare(`
      INSERT INTO orders (
        order_number, customer_id, worker_id, piece_type,
        measurements_id, price, paid, due_date, status,
        payment_type, branch, notes
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      orderNumber,
      order.customer_id,
      order.worker_id,
      order.piece_type,
      order.measurements_id || null,
      order.price,
      order.paid || 0,
      order.due_date,
      order.status || 'In Progress',
      order.payment_type,
      order.branch,
      order.notes || null
    );

    return result.lastInsertRowid as number;
  });

  return transaction();
}

export function updateOrder(id: number, order: Partial<Order>): void {
  const stmt = db.prepare(`
    UPDATE orders
    SET
      customer_id = ?,
      worker_id = ?,
      piece_type = ?,
      measurements_id = ?,
      price = ?,
      paid = ?,
      due_date = ?,
      status = ?,
      payment_type = ?,
      branch = ?,
      notes = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND is_deleted = 0
  `);

  stmt.run(
    order.customer_id,
    order.worker_id,
    order.piece_type,
    order.measurements_id || null,
    order.price,
    order.paid || 0,
    order.due_date,
    order.status || 'In Progress',
    order.payment_type,
    order.branch,
    order.notes || null,
    id
  );
}

export function deleteOrder(id: number): void {
  const stmt = db.prepare('UPDATE orders SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
  stmt.run(id);
}
