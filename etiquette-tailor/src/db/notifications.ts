import db from './schema';

export interface Notification {
  id?: number;
  type: 'order_created' | 'order_status_changed' | 'order_overdue' | 'payment_received' | 'task_status_changed';
  title: string;
  message: string;
  order_id?: number | null;
  task_id?: number | null;
  target_user_id?: number | null;
  target_role?: string | null;
  branch_id?: number | null;
  is_read: number;
  is_deleted: number;
  created_at?: string;
  order_number?: string;
}

export function createNotification(data: Omit<Notification, 'id' | 'is_read' | 'is_deleted' | 'created_at'>): number {
  // Resolve branch_id from the related order when not supplied explicitly,
  // so notifications are always scoped to the branch that owns the order.
  let branchId = data.branch_id ?? null;
  if (branchId == null && data.order_id != null) {
    const row = db.prepare('SELECT branch_id FROM orders WHERE id = ?').get(data.order_id) as { branch_id: number | null } | undefined;
    branchId = row?.branch_id ?? null;
  }

  const stmt = db.prepare(`
    INSERT INTO notifications (type, title, message, order_id, task_id, target_user_id, target_role, branch_id)
    VALUES (@type, @title, @message, @order_id, @task_id, @target_user_id, @target_role, @branch_id)
  `);
  const result = stmt.run({
    type: data.type,
    title: data.title,
    message: data.message,
    order_id: data.order_id ?? null,
    task_id: data.task_id ?? null,
    target_user_id: data.target_user_id ?? null,
    target_role: data.target_role ?? null,
    branch_id: branchId,
  });
  return result.lastInsertRowid as number;
}

export function getNotificationsForUser(userId: number, role: string, branchId: number, limit = 20): Notification[] {
  let query: string;
  let params: any[];

  if (role === 'worker') {
    query = `
      SELECT n.*, o.order_number
      FROM notifications n
      LEFT JOIN orders o ON n.order_id = o.id
      WHERE n.is_deleted = 0
        AND n.branch_id = ?
        AND n.target_user_id = ?
      ORDER BY n.created_at DESC
      LIMIT ?
    `;
    params = [branchId, userId, limit];
  } else {
    query = `
      SELECT n.*, o.order_number
      FROM notifications n
      LEFT JOIN orders o ON n.order_id = o.id
      WHERE n.is_deleted = 0
        AND n.branch_id = ?
        AND (
          (n.target_role IN ('admin', 'manager'))
          OR n.target_user_id = ?
        )
      ORDER BY n.created_at DESC
      LIMIT ?
    `;
    params = [branchId, userId, limit];
  }

  return db.prepare(query).all(...params) as Notification[];
}

export function getUnreadCount(userId: number, role: string, branchId: number): number {
  let query: string;
  let params: any[];

  if (role === 'worker') {
    query = `
      SELECT COUNT(*) as count
      FROM notifications
      WHERE is_deleted = 0 AND is_read = 0
        AND branch_id = ?
        AND target_user_id = ?
    `;
    params = [branchId, userId];
  } else {
    query = `
      SELECT COUNT(*) as count
      FROM notifications
      WHERE is_deleted = 0 AND is_read = 0
        AND branch_id = ?
        AND (
          (target_role IN ('admin', 'manager'))
          OR target_user_id = ?
        )
    `;
    params = [branchId, userId];
  }

  const row = db.prepare(query).get(...params) as { count: number };
  return row.count;
}

export function markAsRead(notificationId: number, branchId: number): void {
  // Branch guard: only notifications in the caller's branch can be marked read
  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND branch_id = ?').run(notificationId, branchId);
}

export function markAllAsRead(userId: number, role: string, branchId: number): void {
  if (role === 'worker') {
    db.prepare('UPDATE notifications SET is_read = 1 WHERE is_read = 0 AND is_deleted = 0 AND branch_id = ? AND target_user_id = ?').run(branchId, userId);
  } else {
    db.prepare(`
      UPDATE notifications SET is_read = 1
      WHERE is_read = 0 AND is_deleted = 0 AND branch_id = ?
        AND (
          (target_role IN ('admin', 'manager'))
          OR target_user_id = ?
        )
    `).run(branchId, userId);
  }
}

export function softDeleteNotification(notificationId: number, branchId: number): void {
  db.prepare('UPDATE notifications SET is_deleted = 1 WHERE id = ? AND branch_id = ?').run(notificationId, branchId);
}

export function clearReadNotifications(userId: number, role: string, branchId: number): number {
  let query: string;
  let params: any[];

  if (role === 'worker') {
    query = `UPDATE notifications SET is_deleted = 1 WHERE is_read = 1 AND is_deleted = 0 AND branch_id = ? AND target_user_id = ?`;
    params = [branchId, userId];
  } else {
    query = `UPDATE notifications SET is_deleted = 1 WHERE is_read = 1 AND is_deleted = 0 AND branch_id = ? AND ((target_role IN ('admin', 'manager')) OR target_user_id = ?)`;
    params = [branchId, userId];
  }

  const result = db.prepare(query).run(...params);
  return result.changes;
}

export function generateOverdueNotifications(branchId?: number): number {
  // When branchId is supplied, only that branch's overdue orders are processed.
  // When omitted, all branches are processed (used for background sweeps).
  const branchFilter = branchId ? ' AND o.branch_id = ?' : '';
  const branchParams = branchId ? [branchId] : [];

  const overdueOrders = db.prepare(`
    SELECT o.id, o.order_number, o.branch_id, c.name as customer_name, o.delivery_date
    FROM orders o
    LEFT JOIN customers c ON o.customer_id = c.id AND c.is_deleted = 0
    WHERE o.status != 'delivered'
      AND o.delivery_date IS NOT NULL
      AND o.delivery_date < date('now')
      AND NOT EXISTS (
        SELECT 1 FROM notifications n
        WHERE n.order_id = o.id
          AND n.type = 'order_overdue'
          AND date(n.created_at) = date('now')
      )
      ${branchFilter}
  `).all(...branchParams) as { id: number; order_number: string; branch_id: number; customer_name: string; delivery_date: string }[];

  if (overdueOrders.length === 0) return 0;

  const insertStmt = db.prepare(`
    INSERT INTO notifications (type, title, message, order_id, target_role, branch_id)
    VALUES ('order_overdue', 'Overdue Order', ?, ?, ?, ?)
  `);

  const txn = db.transaction(() => {
    for (const order of overdueOrders) {
      const msg = `Order ${order.order_number} for ${order.customer_name || 'customer'} is past due (${order.delivery_date})`;
      insertStmt.run(msg, order.id, 'admin', order.branch_id);
      insertStmt.run(msg, order.id, 'manager', order.branch_id);
    }
  });

  txn();
  return overdueOrders.length;
}
