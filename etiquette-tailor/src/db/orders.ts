import db from './connection';
import { logChange } from './supabaseSync';
import { recordOperation } from './undoRedo';

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
  branch_name?: string;
  branch_name_ar?: string;
  branch_prefix?: string;
  branch_phone?: string;
  branch_address?: string;
  is_deleted?: number;
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
  order_item_id?: number;
  task_type: 'cutting' | 'sewing' | 'design';
  assigned_to?: number;
  wage_type: 'percentage' | 'fixed';
  wage_rate: number;
  wage_amount: number;
  task_quantity?: number;
  status: 'pending' | 'in_progress' | 'done';
  started_at?: string;
  completed_at?: string;
  notes?: string;
  worker_name?: string;
  // Joined fields from order_items
  item_piece_type?: string;
  base_price?: number;
}

function generateOrderNumber(branchId: number): string {
  const branch = db.prepare('SELECT prefix, last_sequence FROM branches WHERE id = ?').get(branchId) as { prefix: string; last_sequence: number };
  if (!branch) throw new Error('Branch not found');

  const nextSeq = branch.last_sequence + 1;

  const updateSeq = db.prepare('UPDATE branches SET last_sequence = ? WHERE id = ?');
  updateSeq.run(nextSeq, branchId);

  return `${branch.prefix}-${String(nextSeq).padStart(3, '0')}`;
}

// ── Order Items ────────────────────────────────────────────────────

export interface OrderItem {
  id?: number;
  order_id: number;
  piece_type: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  fabric_source: 'customer' | 'shop';
  fabric_price?: number;
  details?: string;
  sort_order?: number;
  created_at?: string;
  // Joined fields
  base_price?: number;
  name_ar?: string;
}

export function getOrderItems(orderId: number): OrderItem[] {
  const stmt = db.prepare(`
    SELECT oi.*, pt.base_price, pt.name_ar
    FROM order_items oi
    LEFT JOIN piece_types pt ON oi.piece_type = pt.name_en
    WHERE oi.order_id = ? AND oi.is_deleted = 0
    ORDER BY oi.sort_order
  `);
  return stmt.all(orderId) as OrderItem[];
}

export function createOrderItem(item: Omit<OrderItem, 'id'>): number {
  const fabricPrice = item.fabric_price || 0;
  const lineTotal = (item.unit_price * item.quantity) + (fabricPrice * item.quantity);
  const stmt = db.prepare(`
    INSERT INTO order_items (order_id, piece_type, quantity, unit_price, total_price, fabric_source, fabric_price, details, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    item.order_id,
    item.piece_type,
    item.quantity,
    item.unit_price,
    item.total_price || lineTotal,
    item.fabric_source || 'customer',
    fabricPrice,
    item.details || null,
    item.sort_order || 0
  );
  const id = result.lastInsertRowid as number;
  logChange('order_items', id, 'INSERT', { id, ...item });
  recalculateOrderTotal(item.order_id);
  return id;
}

export function updateOrderItem(id: number, data: Partial<OrderItem>): void {
  const fabricPrice = data.fabric_price || 0;
  const lineTotal = (data.unit_price! * data.quantity!) + (fabricPrice * data.quantity!);
  const stmt = db.prepare(`
    UPDATE order_items SET
      piece_type = ?, quantity = ?, unit_price = ?,
      total_price = ?, fabric_source = ?, fabric_price = ?, details = ?
    WHERE id = ?
  `);
  stmt.run(
    data.piece_type,
    data.quantity,
    data.unit_price,
    data.total_price || lineTotal,
    data.fabric_source || 'customer',
    fabricPrice,
    data.details || null,
    id
  );
  logChange('order_items', id, 'UPDATE', data);
  // Recalculate order total after item update
  const row = db.prepare('SELECT order_id FROM order_items WHERE id = ?').get(id) as { order_id: number } | undefined;
  if (row) recalculateOrderTotal(row.order_id);
}

export function deleteOrderItem(id: number): void {
  // Use soft delete to preserve historical data
  const row = db.prepare('SELECT order_id FROM order_items WHERE id = ?').get(id) as { order_id: number } | undefined;
  db.prepare('UPDATE order_items SET is_deleted = 1 WHERE id = ?').run(id);
  logChange('order_items', id, 'DELETE');
  if (row) recalculateOrderTotal(row.order_id);
}

export function recalculateOrderTotal(orderId: number): void {
  const sum = db.prepare(
    'SELECT COALESCE(SUM(total_price), 0) as total FROM order_items WHERE order_id = ? AND is_deleted = 0'
  ).get(orderId) as { total: number };
  db.prepare('UPDATE orders SET price = ? WHERE id = ?').run(sum.total, orderId);
}

export function getAllOrders(branchId: number, status?: string): Order[] {
  let query = `
    SELECT o.*, c.name as customer_name, c.phone as customer_phone,
      COALESCE(ps.paid_sum, 0) as paid,
      b.name_en as branch_name, b.name_ar as branch_name_ar, b.prefix as branch_prefix, b.phone as branch_phone, b.address as branch_address
    FROM orders o
    LEFT JOIN customers c ON o.customer_id = c.id AND c.is_deleted = 0
    LEFT JOIN (SELECT order_id, SUM(amount) as paid_sum FROM order_payments GROUP BY order_id) ps ON ps.order_id = o.id
    LEFT JOIN branches b ON o.branch_id = b.id
  WHERE o.is_deleted = 0 AND o.branch_id = ?
  `;
  const params: any[] = [branchId];

  if (status) {
    query += ' AND o.status = ?';
    params.push(status);
  }
  query += ' ORDER BY o.created_at DESC';

  const stmt = db.prepare(query);
  return stmt.all(...params) as Order[];
}

export function getOrder(id: number): Order | undefined {
  // Sync paid from actual payment records before returning
  db.prepare(`
    UPDATE orders SET paid = COALESCE((SELECT SUM(amount) FROM order_payments WHERE order_id = ?), 0)
    WHERE id = ?
  `).run(id, id);
  const stmt = db.prepare(`
    SELECT o.*, c.name as customer_name, c.phone as customer_phone,
      b.name_en as branch_name, b.name_ar as branch_name_ar, b.prefix as branch_prefix, b.phone as branch_phone, b.address as branch_address
    FROM orders o
    LEFT JOIN customers c ON o.customer_id = c.id AND c.is_deleted = 0
    LEFT JOIN branches b ON o.branch_id = b.id
    WHERE o.id = ? AND o.is_deleted = 0
  `);
  return stmt.get(id) as Order | undefined;
}

export function getOrderByNumber(orderNumber: string): Order | undefined {
  const stmt = db.prepare(`
    SELECT o.*, c.name as customer_name, c.phone as customer_phone
    FROM orders o
    LEFT JOIN customers c ON o.customer_id = c.id AND c.is_deleted = 0
    WHERE o.order_number = ? AND o.is_deleted = 0
  `);
  return stmt.get(orderNumber) as Order | undefined;
}

export function createOrder(order: Omit<Order, 'id' | 'balance'>, measurements?: OrderMeasurement, items?: Omit<OrderItem, 'id' | 'order_id'>[]): number {
  const transaction = db.transaction(() => {
    const orderNumber = order.order_number?.trim() || generateOrderNumber(order.branch_id);

    // Calculate total from items if provided
    const totalPrice = items && items.length > 0
      ? items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0)
      : order.price;

    // Get primary piece_type from first item if provided
    const primaryPieceType = items && items.length > 0 ? items[0].piece_type : order.piece_type;

    const orderStmt = db.prepare(`
      INSERT INTO orders (
        order_number, branch_id, customer_id, piece_type, details,
        price, paid, payment_method, status, receive_date, delivery_date, created_by, fabric_source
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = orderStmt.run(
      orderNumber,
      order.branch_id,
      order.customer_id,
      primaryPieceType,
      order.details || null,
      totalPrice,
      order.paid || 0,
      order.payment_method,
      order.status || 'intake',
      order.receive_date || null,
      order.delivery_date || null,
      order.created_by || null,
      (items && items.length > 0) ? items[0].fabric_source || 'customer' : 'customer'
    );

    const orderId = result.lastInsertRowid as number;

    // Log the order creation for sync
    logChange('orders', orderId, 'INSERT', {
      id: orderId,
      order_number: orderNumber,
      branch_id: order.branch_id,
      customer_id: order.customer_id,
      piece_type: primaryPieceType,
      price: totalPrice,
      paid: order.paid || 0,
      status: order.status || 'intake',
    });

    // Insert order items
    if (items && items.length > 0) {
      const itemStmt = db.prepare(`
        INSERT INTO order_items (order_id, piece_type, quantity, unit_price, total_price, fabric_source, fabric_price, details, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const fabricPrice = item.fabric_price || 0;
        const itemResult = itemStmt.run(
          orderId,
          item.piece_type,
          item.quantity,
          item.unit_price,
          (item.unit_price * item.quantity) + (fabricPrice * item.quantity),
          item.fabric_source || 'customer',
          fabricPrice,
          item.details || null,
          i
        );
        // Log each order item for sync
        logChange('order_items', itemResult.lastInsertRowid as number, 'INSERT', {
          id: itemResult.lastInsertRowid,
          order_id: orderId,
          piece_type: item.piece_type,
          quantity: item.quantity,
          unit_price: item.unit_price,
        });
      }
    }

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

export interface WorkflowPayload {
  branch_id: number;
  customer_id: number;
  created_by: number;
  payment_method: 'cash' | 'card';
  delivery_date: string;
  receive_date?: string;
  fabric_source?: 'customer' | 'shop';
  notes?: string;
  items: {
    piece_type: string;
    quantity: number;
    unit_price: number;
    fabric_source?: 'customer' | 'shop';
    fabric_price?: number;
    details?: string;
    cutter_id?: number;
    cutter_wage_type?: 'percentage' | 'fixed';
    cutter_wage_rate?: number;
    tailors?: {
      worker_id: number;
      quantity: number;
      wage_type: 'percentage' | 'fixed';
      wage_rate: number;
    }[];
  }[];
  measurements?: {
    chest?: number;
    waist?: number;
    hips?: number;
    length?: number;
    sleeve?: number;
    shoulder?: number;
    notes?: string;
  };
  initial_payment?: {
    amount: number;
    method: 'cash' | 'card';
    note?: string;
  };
}

export function createOrderWithTasks(payload: WorkflowPayload): { orderId: number; orderNumber: string } {
  const result = db.transaction(() => {
    const orderNumber = generateOrderNumber(payload.branch_id);
    const totalPrice = payload.items.reduce((sum, i) => sum + (i.unit_price * i.quantity), 0);

    db.prepare(`
      INSERT INTO orders (order_number, branch_id, customer_id, piece_type, details, price, paid, payment_method, status, receive_date, delivery_date, created_by, fabric_source)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'intake', ?, ?, ?, ?)
    `).run(
      orderNumber,
      payload.branch_id,
      payload.customer_id,
      payload.items[0].piece_type,
      payload.notes || null,
      totalPrice,
      payload.initial_payment?.amount || 0,
      payload.payment_method,
      payload.receive_date || new Date().toISOString().split('T')[0],
      payload.delivery_date,
      payload.created_by,
      payload.fabric_source || 'customer'
    );

    const orderId = (db.prepare('SELECT last_insert_rowid() as id').get() as { id: number }).id;

    // Log the order creation for sync
    logChange('orders', orderId, 'INSERT', {
      id: orderId,
      order_number: orderNumber,
      branch_id: payload.branch_id,
      customer_id: payload.customer_id,
      piece_type: payload.items[0].piece_type,
      price: totalPrice,
      paid: payload.initial_payment?.amount || 0,
      status: 'intake',
    });

    if (payload.measurements) {
      const m = payload.measurements;
      db.prepare(`
        INSERT INTO order_measurements (order_id, chest, waist, hips, length, sleeve, shoulder, notes, taken_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(orderId, m.chest || null, m.waist || null, m.hips || null, m.length || null, m.sleeve || null, m.shoulder || null, m.notes || null, payload.created_by);
    }

    for (const item of payload.items) {
      const itemTotal = item.unit_price * item.quantity;
      db.prepare(`
        INSERT INTO order_items (order_id, piece_type, quantity, unit_price, total_price, fabric_source, fabric_price, details)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        orderId, item.piece_type, item.quantity, item.unit_price, itemTotal,
        item.fabric_source || 'customer', item.fabric_price || 0, item.details || null
      );
      const itemId = (db.prepare('SELECT last_insert_rowid() as id').get() as { id: number }).id;

      // Log order item for sync
      logChange('order_items', itemId, 'INSERT', {
        id: itemId,
        order_id: orderId,
        piece_type: item.piece_type,
        quantity: item.quantity,
        unit_price: item.unit_price,
      });

      if (item.cutter_id && item.cutter_wage_type && item.cutter_wage_rate !== undefined) {
        const wageAmount = item.cutter_wage_type === 'percentage'
          ? (itemTotal * item.cutter_wage_rate / 100)
          : item.cutter_wage_rate;
        const cuttingResult = db.prepare(`
          INSERT INTO order_tasks (order_id, order_item_id, task_type, assigned_to, wage_type, wage_rate, wage_amount, task_quantity, status)
          VALUES (?, ?, 'cutting', ?, ?, ?, ?, ?, 'pending')
        `).run(orderId, itemId, item.cutter_id, item.cutter_wage_type, item.cutter_wage_rate, wageAmount, 1);
        // Log cutting task for sync
        logChange('order_tasks', cuttingResult.lastInsertRowid as number, 'INSERT', {
          id: cuttingResult.lastInsertRowid,
          order_id: orderId,
          order_item_id: itemId,
          task_type: 'cutting',
          assigned_to: item.cutter_id,
        });
      }

      if (item.tailors && item.tailors.length > 0) {
        for (const t of item.tailors) {
          const wageAmount = t.wage_type === 'percentage'
            ? (item.unit_price * t.quantity * t.wage_rate / 100)
            : t.wage_rate;
          const sewingResult = db.prepare(`
            INSERT INTO order_tasks (order_id, order_item_id, task_type, assigned_to, wage_type, wage_rate, wage_amount, task_quantity, status)
            VALUES (?, ?, 'sewing', ?, ?, ?, ?, ?, 'pending')
          `).run(orderId, itemId, t.worker_id, t.wage_type, t.wage_rate, wageAmount, t.quantity);
          // Log sewing task for sync
          logChange('order_tasks', sewingResult.lastInsertRowid as number, 'INSERT', {
            id: sewingResult.lastInsertRowid,
            order_id: orderId,
            order_item_id: itemId,
            task_type: 'sewing',
            assigned_to: t.worker_id,
          });
        }
      }
    }

    if (payload.initial_payment && payload.initial_payment.amount > 0) {
      const paymentResult = db.prepare(`
        INSERT INTO order_payments (order_id, amount, method, note, created_by)
        VALUES (?, ?, ?, ?, ?)
      `).run(orderId, payload.initial_payment.amount, payload.initial_payment.method, payload.initial_payment.note || 'Initial payment', payload.created_by);
      // Log payment for sync
      logChange('order_payments', paymentResult.lastInsertRowid as number, 'INSERT', {
        id: paymentResult.lastInsertRowid,
        order_id: orderId,
        amount: payload.initial_payment.amount,
        method: payload.initial_payment.method,
      });
    }

    return { orderId, orderNumber };
  })();

  return result;
}

export function updateOrder(id: number, order: Partial<Order>, userId?: number): void {
  const existing = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as Record<string, any> | undefined;
  if (!existing) throw new Error('Order not found');

  const fields: string[] = [];
  const values: any[] = [];

  const setField = (col: string) => {
    if (col in order) {
      fields.push(`${col} = ?`);
      values.push((order as any)[col]);
    }
  };

  setField('branch_id');
  setField('customer_id');
  setField('piece_type');
  setField('details');
  setField('price');
  setField('paid');
  setField('payment_method');
  setField('status');
  setField('delivery_date');
  setField('receive_date');
  setField('fabric_source');
  setField('created_by');
  setField('is_deleted');

  if (fields.length === 0) return;

  values.push(id);
  const stmt = db.prepare(`UPDATE orders SET ${fields.join(', ')} WHERE id = ?`);
  stmt.run(...values);
  logChange('orders', id, 'UPDATE', order);
  if (userId) {
    const after = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as Record<string, any>;
    recordOperation('orders', id, 'UPDATE', existing, after, userId);
  }
}

export function updateOrderStatus(id: number, status: string, userId?: number): void {
  const before = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as Record<string, any> | undefined;
  if (status === 'delivered') {
    const order = db.prepare('SELECT price, paid FROM orders WHERE id = ?').get(id) as { price: number; paid: number } | undefined;
    if (!order) throw new Error('Order not found');
    if (order.paid < order.price) {
      throw new Error(`Cannot deliver: balance outstanding (${(order.price - order.paid).toFixed(2)} QAR remaining)`);
    }
  }
  const stmt = db.prepare('UPDATE orders SET status = ? WHERE id = ?');
  stmt.run(status, id);
  logChange('orders', id, 'UPDATE', { status });
  if (userId && before) {
    const after = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as Record<string, any>;
    recordOperation('orders', id, 'UPDATE', before, after, userId);
  }
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
  logChange('order_measurements', orderId, 'UPDATE', measurements);
}

export function getOrderTasks(orderId: number): OrderTask[] {
  const stmt = db.prepare(`
    SELECT ot.*, u.name as worker_name,
      oi.piece_type as item_piece_type,
      pt.base_price
    FROM order_tasks ot
    LEFT JOIN users u ON ot.assigned_to = u.id
    LEFT JOIN order_items oi ON ot.order_item_id = oi.id AND oi.is_deleted = 0
    LEFT JOIN piece_types pt ON oi.piece_type = pt.name_en
    WHERE ot.order_id = ?
    ORDER BY ot.task_type
  `);
  return stmt.all(orderId) as OrderTask[];
}

export function createOrderTask(task: Omit<OrderTask, 'id'>): number {
  const stmt = db.prepare(`
    INSERT INTO order_tasks (order_id, order_item_id, task_type, assigned_to, wage_type, wage_rate, wage_amount, task_quantity, status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    task.order_id,
    (task as any).order_item_id || null,
    task.task_type,
    task.assigned_to || null,
    task.wage_type,
    task.wage_rate,
    task.wage_amount,
    (task as any).task_quantity || 1,
    task.status || 'pending',
    task.notes || null
  );
  const id = result.lastInsertRowid as number;
  logChange('order_tasks', id, 'INSERT', { id, ...task });
  return id;
}

export function updateTaskStatus(taskId: number, status: string, userId?: number): void {
  const before = db.prepare('SELECT * FROM order_tasks WHERE id = ?').get(taskId) as Record<string, any> | undefined;
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
  logChange('order_tasks', taskId, 'UPDATE', { status });
  if (userId && before) {
    const after = db.prepare('SELECT * FROM order_tasks WHERE id = ?').get(taskId) as Record<string, any>;
    recordOperation('order_tasks', taskId, 'UPDATE', before, after, userId);
  }
}

export function reassignTask(taskId: number, newUserId: number, wageType: string, wageRate: number, wageAmount: number): void {
  const stmt = db.prepare(`
    UPDATE order_tasks SET assigned_to = ?, wage_type = ?, wage_rate = ?, wage_amount = ?, status = 'pending', started_at = NULL, completed_at = NULL
    WHERE id = ?
  `);
  stmt.run(newUserId, wageType, wageRate, wageAmount, taskId);
  logChange('order_tasks', taskId, 'UPDATE', { assigned_to: newUserId, wage_type: wageType, wage_rate: wageRate, wage_amount: wageAmount });
}

export function searchOrders(query: string, branchId: number): Order[] {
  const searchTerm = `%${query}%`;
  const sql = `
    SELECT o.*, c.name as customer_name, c.phone as customer_phone,
      b.name_en as branch_name, b.name_ar as branch_name_ar, b.prefix as branch_prefix, b.phone as branch_phone, b.address as branch_address
    FROM orders o
    LEFT JOIN customers c ON o.customer_id = c.id AND c.is_deleted = 0
    LEFT JOIN branches b ON o.branch_id = b.id
    WHERE o.is_deleted = 0 AND o.branch_id = ? AND (o.order_number LIKE ? OR c.name LIKE ? OR c.phone LIKE ?)
    ORDER BY o.created_at DESC
  `;
  const params: any[] = [branchId, searchTerm, searchTerm, searchTerm];

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
  task_quantity?: number;
  status: string;
  started_at?: string;
  completed_at?: string;
  due_date?: string;
  branch_id: number;
  order_price?: number;
  order_status?: string;
  notes?: string;
  order_item_id?: number;
  base_price?: number;
}

export function getAllTasks(filters: { branchId: number; workerId?: number; taskType?: string }): TaskBoardItem[] {
  let query = `
    SELECT
      ot.id as task_id,
      ot.order_id,
      o.order_number,
      c.name as customer_name,
      COALESCE(oi.piece_type, o.piece_type) as piece_type,
      COALESCE(oi.details, o.details) as details,
      ot.task_type,
      ot.assigned_to,
      u.name as worker_name,
      ot.wage_type,
      ot.wage_rate,
      ot.wage_amount,
      COALESCE(ot.task_quantity, 1) as task_quantity,
      ot.order_item_id,
      pt.base_price,
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
    LEFT JOIN order_items oi ON ot.order_item_id = oi.id AND oi.is_deleted = 0
    LEFT JOIN piece_types pt ON oi.piece_type = pt.name_en
    LEFT JOIN customers c ON o.customer_id = c.id AND c.is_deleted = 0
    LEFT JOIN users u ON ot.assigned_to = u.id
    WHERE o.is_deleted = 0 AND o.branch_id = ?
  `;
  const params: any[] = [filters.branchId];

  if (filters.workerId) {
    query += ' AND ot.assigned_to = ?';
    params.push(filters.workerId);
  }
  if (filters.taskType) {
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

export function getOrderStats(branchId: number): { total: number; in_progress: number; ready: number; delivered: number; overdue: number; revenue: number } {
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
    WHERE is_deleted = 0 AND branch_id = ?
  `);
  return stmt.get(today, branchId) as { total: number; in_progress: number; ready: number; delivered: number; overdue: number; revenue: number };
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

export function getReportStats(branchId: number, period?: string): ReportStats {
  const params: any[] = [branchId];

  const { filter: dateFilter } = getPeriodDateFilter(period);

  const stmt = db.prepare(`
    SELECT
      COUNT(*) as totalOrders,
      COALESCE(SUM(price), 0) as revenue
    FROM orders
    WHERE is_deleted = 0 AND branch_id = ?${dateFilter}
  `);
  const orderStats = stmt.get(...params) as { totalOrders: number; revenue: number };

  // Workers cost = sum of all task wages
  const costDateFilter = dateFilter.replace(/created_at/g, 'o.created_at');

  const costStmt = db.prepare(`
    SELECT COALESCE(SUM(ot.wage_amount), 0) as workersCost
    FROM order_tasks ot
    JOIN orders o ON ot.order_id = o.id
    WHERE o.is_deleted = 0 AND o.branch_id = ?${costDateFilter}
  `);
  const costResult = costStmt.get(branchId) as { workersCost: number };

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

export function getPaymentSplit(branchId: number, period?: string): PaymentSplit {
  const params: any[] = [branchId];

  const { filter: dateFilter } = getPeriodDateFilter(period);

  const stmt = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN payment_method = 'card' THEN price ELSE 0 END), 0) as cardAmount,
      COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN price ELSE 0 END), 0) as cashAmount,
      COUNT(*) as total
    FROM orders
    WHERE is_deleted = 0 AND branch_id = ?${dateFilter}
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

export function getMonthlyRevenue(months: number = 6, branchId: number): MonthlyRevenue[] {
  const stmt = db.prepare(`
    SELECT
      strftime('%Y-%m', created_at) as month_key,
      COALESCE(SUM(price), 0) as value
    FROM orders
    WHERE is_deleted = 0 AND created_at >= date('now', '-${months} months') AND branch_id = ?
    GROUP BY strftime('%Y-%m', created_at)
    ORDER BY month_key ASC
  `);
  const rows = stmt.all(branchId) as { month_key: string; value: number }[];

  return rows.map((r) => {
    const d = new Date(r.month_key + '-01');
    const monthLabel = d.toLocaleDateString('en', { month: 'short' });
    return { month: monthLabel, value: r.value };
  });
}

export function getRecentOrders(limit: number = 10, branchId: number, period?: string): any[] {
  const params: any[] = [branchId];

  const { filter: dateFilter } = getPeriodDateFilter(period);
  const orderDateFilter = dateFilter.replace(/created_at/g, 'o.created_at');

  const stmt = db.prepare(`
    SELECT o.*, c.name as customer_name
    FROM orders o
    LEFT JOIN customers c ON o.customer_id = c.id AND c.is_deleted = 0
    WHERE o.is_deleted = 0 AND o.branch_id = ?${orderDateFilter}
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

export function addOrderPayment(orderId: number, amount: number, method: 'cash' | 'card', note: string | null, createdBy: number | null, userId?: number): number {
  const txn = db.transaction(() => {
    const insertStmt = db.prepare(
      'INSERT INTO order_payments (order_id, amount, method, note, created_by) VALUES (?, ?, ?, ?, ?)'
    );
    const result = insertStmt.run(orderId, amount, method, note, createdBy);
    const id = result.lastInsertRowid as number;
    logChange('order_payments', id, 'INSERT', { order_id: orderId, amount, method, note, created_by: createdBy });

    // Recalculate total paid from all payment records
    const sumRow = db.prepare(
      'SELECT COALESCE(SUM(amount), 0) as total FROM order_payments WHERE order_id = ?'
    ).get(orderId) as { total: number };

    db.prepare('UPDATE orders SET paid = ? WHERE id = ?').run(sumRow.total, orderId);

    if (userId) {
      const after = db.prepare('SELECT * FROM order_payments WHERE id = ?').get(id) as Record<string, any>;
      recordOperation('order_payments', id, 'INSERT', null, after, userId);
    }

    return id;
  });

  return txn();
}

export function getOrderPayments(orderId: number): OrderPayment[] {
  const stmt = db.prepare(
    'SELECT * FROM order_payments WHERE order_id = ? ORDER BY created_at ASC'
  );
  return stmt.all(orderId) as OrderPayment[];
}

export function deleteOrderPayment(paymentId: number, userId?: number): void {
  const txn = db.transaction(() => {
    const payment = db.prepare('SELECT * FROM order_payments WHERE id = ?').get(paymentId) as Record<string, any> | undefined;
    if (!payment) return;

    const before = { ...payment };

    db.prepare('DELETE FROM order_payments WHERE id = ?').run(paymentId);
    logChange('order_payments', paymentId, 'DELETE');

    // Recalculate total paid
    const sumRow = db.prepare(
      'SELECT COALESCE(SUM(amount), 0) as total FROM order_payments WHERE order_id = ?'
    ).get(payment.order_id) as { total: number };

    db.prepare('UPDATE orders SET paid = ? WHERE id = ?').run(sumRow.total, payment.order_id);

    if (userId) {
      recordOperation('order_payments', paymentId, 'DELETE', before, null, userId);
    }
  });

  txn();
}

// Sync all orders' paid column from actual payment records
export function syncAllOrderPayments(): void {
  db.prepare(`
    UPDATE orders SET paid = COALESCE((SELECT SUM(op.amount) FROM order_payments op WHERE op.order_id = orders.id), 0)
  `).run();
}

// ── Advanced Reports ──────────────────────────────────────────────────

export interface AdvancedReportFilter {
  branchId: number;
  startDate?: string;
  endDate?: string;
  workerId?: number;
  status?: string;
}

export interface WorkerPerformance {
  worker_id: number;
  worker_name: string;
  order_count: number;
  percentage: number;
  revenue: number;
}

export interface AdvancedReportData {
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  completedOrders: number;
  workerPerformance: WorkerPerformance[];
  orders: any[];
}

export function getAdvancedReport(filter: AdvancedReportFilter): AdvancedReportData {
  // Branch isolation is mandatory — the IPC layer always supplies branchId.
  const branchId = filter.branchId!;
  let where = 'WHERE o.is_deleted = 0 AND o.branch_id = ?';
  const params: any[] = [branchId];

  if (filter.startDate) {
    where += ' AND date(o.created_at) >= ?';
    params.push(filter.startDate);
  }
  if (filter.endDate) {
    where += ' AND date(o.created_at) <= ?';
    params.push(filter.endDate);
  }
  if (filter.status) {
    where += ' AND o.status = ?';
    params.push(filter.status);
  }

  const summary = db.prepare(`
    SELECT
      COUNT(*) as totalOrders,
      COALESCE(SUM(o.price), 0) as totalRevenue,
      COALESCE(SUM(CASE WHEN o.status NOT IN ('delivered') THEN 1 ELSE 0 END), 0) as pendingOrders,
      COALESCE(SUM(CASE WHEN o.status = 'delivered' THEN 1 ELSE 0 END), 0) as completedOrders
    FROM orders o
    ${where}
  `).get(...params) as any;

  let workerWhere = ' AND o.branch_id = ?';
  const workerParams: any[] = [branchId];
  if (filter.startDate) { workerWhere += ' AND date(o.created_at) >= ?'; workerParams.push(filter.startDate); }
  if (filter.endDate) { workerWhere += ' AND date(o.created_at) <= ?'; workerParams.push(filter.endDate); }
  if (filter.workerId) { workerWhere += ' AND ot.assigned_to = ?'; workerParams.push(filter.workerId); }

  const workers = db.prepare(`
    SELECT
      u.id as worker_id,
      u.name as worker_name,
      COUNT(DISTINCT o.id) as order_count,
      COALESCE(SUM(o.price), 0) as revenue
    FROM order_tasks ot
    JOIN orders o ON ot.order_id = o.id
    JOIN users u ON ot.assigned_to = u.id
    WHERE o.is_deleted = 0 ${workerWhere}
    GROUP BY u.id, u.name
    ORDER BY order_count DESC
  `).all(...workerParams) as { worker_id: number; worker_name: string; order_count: number; revenue: number }[];

  const totalWorkerOrders = workers.reduce((s, w) => s + w.order_count, 0);
  const workerPerformance: WorkerPerformance[] = workers.map(w => ({
    ...w,
    percentage: totalWorkerOrders > 0 ? Math.round((w.order_count / totalWorkerOrders) * 100) : 0,
  }));

  const orderFilter = filter.workerId
    ? ` AND o.id IN (SELECT DISTINCT order_id FROM order_tasks WHERE assigned_to = ${filter.workerId})`
    : '';
  const orders = db.prepare(`
    SELECT o.*, c.name as customer_name, c.phone as customer_phone
    FROM orders o
    LEFT JOIN customers c ON o.customer_id = c.id AND c.is_deleted = 0
    ${where}${orderFilter}
    ORDER BY o.created_at DESC
  `).all(...params) as any[];

  return {
    totalOrders: summary.totalOrders || 0,
    totalRevenue: summary.totalRevenue || 0,
    pendingOrders: summary.pendingOrders || 0,
    completedOrders: summary.completedOrders || 0,
    workerPerformance,
    orders,
  };
}

export interface DailyStat {
  date: string;
  orders: number;
  revenue: number;
}

export function getDailyStats(days: number, branchId: number): DailyStat[] {
  const rows = db.prepare(`
    SELECT
      date(created_at) as date,
      COUNT(*) as orders,
      COALESCE(SUM(price), 0) as revenue
    FROM orders
    WHERE is_deleted = 0 AND date(created_at) >= date('now', '-${days} days') AND branch_id = ?
    GROUP BY date(created_at)
    ORDER BY date ASC
  `).all(branchId) as { date: string; orders: number; revenue: number }[];

  return rows;
}

export interface WorkerContribution {
  worker_name: string;
  task_count: number;
  wage_total: number;
}

export function getWorkerContribution(branchId: number, startDate?: string, endDate?: string): WorkerContribution[] {
  let filter = ' AND o.branch_id = ?';
  const params: any[] = [branchId];
  if (startDate) { filter += ' AND date(o.created_at) >= ?'; params.push(startDate); }
  if (endDate) { filter += ' AND date(o.created_at) <= ?'; params.push(endDate); }

  return db.prepare(`
    SELECT
      u.name as worker_name,
      COUNT(*) as task_count,
      COALESCE(SUM(ot.wage_amount), 0) as wage_total
    FROM order_tasks ot
    JOIN orders o ON ot.order_id = o.id
    JOIN users u ON ot.assigned_to = u.id
    WHERE o.is_deleted = 0${filter}
    GROUP BY u.id, u.name
    ORDER BY task_count DESC
  `).all(...params) as WorkerContribution[];
}

export function saveReportEmail(email: string, label?: string): number {
  const existing = db.prepare('SELECT id FROM report_emails WHERE email = ?').get(email) as { id: number } | undefined;
  if (existing) return existing.id;
  const result = db.prepare('INSERT INTO report_emails (email, label) VALUES (?, ?)').run(email, label || null);
  return Number(result.lastInsertRowid);
}

export function getReportEmails(): { id: number; email: string; label: string | null; created_at: string }[] {
  return db.prepare('SELECT id, email, label, created_at FROM report_emails ORDER BY created_at DESC').all() as { id: number; email: string; label: string | null; created_at: string }[];
}

export function deleteReportEmail(id: number): void {
  db.prepare('DELETE FROM report_emails WHERE id = ?').run(id);
}

// ── Branch Integrity Scan ──────────────────────────────────────────────────
// Read-only diagnostic. Scans for records whose branch_id is inconsistent with
// related records (e.g. an order in branch A whose customer is in branch B, or a
// task whose worker is in a different branch than the order). This does NOT modify
// any data — it only reports suspicious rows so an admin can re-attribute them.

export interface IntegrityFinding {
  type: string;            // short category label
  id: number;              // primary record id
  detail: string;          // human-readable description
  order_branch_id?: number | null;
  related_branch_id?: number | null;
}

export interface BranchIntegrityReport {
  scannedAt: string;
  branchCount: number;
  findings: IntegrityFinding[];
  totals: Record<string, number>;
}

export function getBranchIntegrityReport(): BranchIntegrityReport {
  const findings: IntegrityFinding[] = [];

  // 1. Orders whose branch_id differs from their customer's branch_id
  try {
    const mismatched = db.prepare(`
      SELECT o.id, o.order_number, o.branch_id AS order_branch_id, c.branch_id AS customer_branch_id,
             c.name AS customer_name
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      WHERE o.is_deleted = 0 AND c.is_deleted = 0
        AND o.branch_id IS NOT NULL AND c.branch_id IS NOT NULL
        AND o.branch_id != c.branch_id
      ORDER BY o.id
    `).all() as { id: number; order_number: string; order_branch_id: number; customer_branch_id: number; customer_name: string }[];
    for (const r of mismatched) {
      findings.push({
        type: 'order_customer_branch_mismatch',
        id: r.id,
        detail: `Order ${r.order_number} (customer ${r.customer_name || '?'}) is in branch ${r.order_branch_id} but its customer is in branch ${r.customer_branch_id}.`,
        order_branch_id: r.order_branch_id,
        related_branch_id: r.customer_branch_id,
      });
    }
  } catch { /* column may be missing on very old DBs */ }

  // 2. Orders with null branch_id
  try {
    const nullBranchOrders = db.prepare(`
      SELECT id, order_number FROM orders WHERE is_deleted = 0 AND branch_id IS NULL
      ORDER BY id
    `).all() as { id: number; order_number: string }[];
    for (const r of nullBranchOrders) {
      findings.push({
        type: 'order_null_branch',
        id: r.id,
        detail: `Order ${r.order_number} has no branch assigned.`,
      });
    }
  } catch { /* ignore */ }

  // 3. Customers with null branch_id
  try {
    const nullBranchCustomers = db.prepare(`
      SELECT id, name FROM customers WHERE is_deleted = 0 AND branch_id IS NULL
      ORDER BY id
    `).all() as { id: number; name: string | null }[];
    for (const r of nullBranchCustomers) {
      findings.push({
        type: 'customer_null_branch',
        id: r.id,
        detail: `Customer ${r.name || '(unnamed)'} [id ${r.id}] has no branch assigned.`,
      });
    }
  } catch { /* ignore */ }

  // 4. Tasks whose assigned worker's branch differs from the order's branch
  try {
    const taskMismatches = db.prepare(`
      SELECT ot.id AS task_id, o.order_number, o.branch_id AS order_branch_id, u.branch_id AS worker_branch_id,
             u.name AS worker_name
      FROM order_tasks ot
      JOIN orders o ON ot.order_id = o.id
      JOIN users u ON ot.assigned_to = u.id
      WHERE o.is_deleted = 0
        AND o.branch_id IS NOT NULL AND u.branch_id IS NOT NULL
        AND o.branch_id != u.branch_id
      ORDER BY ot.id
    `).all() as { task_id: number; order_number: string; order_branch_id: number; worker_branch_id: number; worker_name: string }[];
    for (const r of taskMismatches) {
      findings.push({
        type: 'task_worker_branch_mismatch',
        id: r.task_id,
        detail: `Task ${r.task_id} (order ${r.order_number}, worker ${r.worker_name}) — order is in branch ${r.order_branch_id} but worker is in branch ${r.worker_branch_id}.`,
        order_branch_id: r.order_branch_id,
        related_branch_id: r.worker_branch_id,
      });
    }
  } catch { /* ignore */ }

  // 5. Users with null branch_id
  try {
    const nullBranchUsers = db.prepare(`
      SELECT id, name, role FROM users WHERE active = 1 AND branch_id IS NULL
      ORDER BY id
    `).all() as { id: number; name: string; role: string }[];
    for (const r of nullBranchUsers) {
      findings.push({
        type: 'user_null_branch',
        id: r.id,
        detail: `User ${r.name} (${r.role}) [id ${r.id}] has no branch assigned.`,
      });
    }
  } catch { /* ignore */ }

  // 6. Expenses with null branch_id (informational — shared/global expenses)
  try {
    const nullBranchExpenses = db.prepare(`
      SELECT id, description FROM expenses WHERE is_deleted = 0 AND branch_id IS NULL
      ORDER BY id
    `).all() as { id: number; description: string }[];
    for (const r of nullBranchExpenses) {
      findings.push({
        type: 'expense_null_branch',
        id: r.id,
        detail: `Expense "${r.description}" [id ${r.id}] has no branch assigned (treated as shared).`,
      });
    }
  } catch { /* ignore */ }

  const totals: Record<string, number> = {};
  for (const f of findings) {
    totals[f.type] = (totals[f.type] || 0) + 1;
  }

  const branchCountRow = db.prepare('SELECT COUNT(*) AS c FROM branches').get() as { c: number };

  return {
    scannedAt: new Date().toISOString(),
    branchCount: branchCountRow.c,
    findings,
    totals,
  };
}
