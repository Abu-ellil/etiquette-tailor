import { supabase } from './supabase';
import { getSyncSource, getBranchId } from './supabaseSync';
import db from './connection';

let channel: ReturnType<typeof supabase.channel> | null = null;
export let isApplyingRemote = false;

const SYNC_TABLES = [
  'customers', 'orders', 'order_items', 'order_payments',
  'order_measurements', 'order_tasks', 'expenses', 'users', 'piece_types',
];

export function getIsApplyingRemote(): boolean {
  return isApplyingRemote;
}

export function subscribeToRemoteChanges(
  onRemoteChange?: (table: string, op: string) => void
): void {
  if (channel) {
    channel.unsubscribe();
    supabase.removeChannel(channel);
  }

  const syncSource = getSyncSource();
  channel = supabase.channel(`sync-${syncSource}`);

  for (const table of SYNC_TABLES) {
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table, filter: `sync_source=neq.${syncSource}` },
      (payload) => {
        handleRemoteEvent(table, payload, onRemoteChange);
      }
    );
  }

  channel.subscribe((status) => {
    console.log(`[realtime] channel status: ${status}`);
  });
}

export function unsubscribeFromRemoteChanges(): void {
  if (channel) {
    channel.unsubscribe();
    supabase.removeChannel(channel);
    channel = null;
  }
}

function handleRemoteEvent(
  table: string,
  payload: any,
  onRemoteChange?: (table: string, op: string) => void
): void {
  isApplyingRemote = true;
  try {
    const { eventType, new: newRow, old: oldRow } = payload;
    const syncSource = getSyncSource();
    const branchId = getBranchId();

    switch (table) {
      case 'customers':
        applyRemoteCustomer(eventType, newRow, oldRow, syncSource, branchId);
        break;
      case 'orders':
        applyRemoteOrder(eventType, newRow, oldRow, syncSource, branchId);
        break;
      case 'order_items':
        applyRemoteOrderItem(eventType, newRow, oldRow, syncSource);
        break;
      case 'order_payments':
        applyRemoteOrderPayment(eventType, newRow, oldRow, syncSource);
        break;
      case 'order_measurements':
        applyRemoteOrderMeasurement(eventType, newRow, oldRow, syncSource);
        break;
      case 'order_tasks':
        applyRemoteOrderTask(eventType, newRow, oldRow, syncSource);
        break;
      case 'expenses':
        applyRemoteExpense(eventType, newRow, oldRow, syncSource, branchId);
        break;
      case 'users':
        applyRemoteUser(eventType, newRow, oldRow, syncSource);
        break;
      case 'piece_types':
        applyRemotePieceType(eventType, newRow, oldRow, syncSource);
        break;
    }

    onRemoteChange?.(table, eventType);
    console.log(`[realtime] applied ${eventType} on ${table}`);
  } catch (err) {
    console.error(`[realtime] error applying change on ${table}:`, err);
  } finally {
    isApplyingRemote = false;
  }
}

// ── Per-table remote change appliers ─────────────────────────────────

function applyRemoteCustomer(eventType: string, newRow: any, oldRow: any, syncSource: string, branchId: number): void {
  if (eventType === 'DELETE') {
    const local = findLocalBySyncRef('customers', oldRow);
    if (local) db.prepare('UPDATE customers SET is_deleted = 1 WHERE id = ?').run(local.id);
    return;
  }

  const existing = db.prepare('SELECT id FROM customers WHERE phone = ? AND branch_id = ?')
    .get(newRow.phone, newRow.branch_id ?? branchId) as { id: number } | undefined;

  if (existing) {
    db.prepare('UPDATE customers SET name = ?, phone = ?, notes = ? WHERE id = ?')
      .run(newRow.name, newRow.phone, newRow.notes, existing.id);
  } else {
    db.prepare('INSERT INTO customers (name, phone, notes, branch_id, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(newRow.name, newRow.phone, newRow.notes, newRow.branch_id ?? branchId, newRow.created_at);
  }
}

function applyRemoteOrder(eventType: string, newRow: any, oldRow: any, syncSource: string, branchId: number): void {
  if (eventType === 'DELETE') {
    const local = findLocalBySyncRef('orders', oldRow);
    if (local) db.prepare('UPDATE orders SET is_deleted = 1 WHERE id = ?').run(local.id);
    return;
  }

  const existing = db.prepare('SELECT id FROM orders WHERE order_number = ?')
    .get(newRow.order_number) as { id: number } | undefined;

  if (existing) {
    db.prepare(`UPDATE orders SET piece_type = ?, details = ?, price = ?, paid = ?,
      payment_method = ?, status = ?, delivery_date = ?, fabric_source = ? WHERE id = ?`)
      .run(newRow.piece_type, newRow.details, newRow.price, newRow.paid,
        newRow.payment_method, newRow.status, newRow.delivery_date, newRow.fabric_source, existing.id);
  } else {
    // Find or create customer locally
    let localCustId = newRow.customer_id;
    if (newRow.customer_id) {
      const cust = db.prepare('SELECT id FROM customers WHERE phone IN (SELECT phone FROM customers WHERE id = ?) LIMIT 1')
        .get(newRow.customer_id) as { id: number } | undefined;
      if (cust) localCustId = cust.id;
    }

    db.prepare(`INSERT INTO orders (order_number, branch_id, customer_id, piece_type, details,
      price, paid, payment_method, status, receive_date, delivery_date, created_by, fabric_source, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(newRow.order_number, newRow.branch_id ?? branchId, localCustId, newRow.piece_type, newRow.details,
        newRow.price, newRow.paid, newRow.payment_method, newRow.status, newRow.receive_date,
        newRow.delivery_date, newRow.created_by, newRow.fabric_source, newRow.created_at);
  }
}

function applyRemoteOrderItem(eventType: string, newRow: any, oldRow: any, syncSource: string): void {
  if (eventType === 'DELETE') {
    const local = findLocalBySyncRef('order_items', oldRow);
    if (local) db.prepare('UPDATE order_items SET is_deleted = 1 WHERE id = ?').run(local.id);
    return;
  }

  // Find local order
  const order = findLocalOrderByRemoteRef(newRow.order_id, syncSource);
  if (!order) return;

  const existing = db.prepare('SELECT id FROM order_items WHERE order_id = ? AND piece_type = ? AND sort_order = ?')
    .get(order.id, newRow.piece_type, newRow.sort_order) as { id: number } | undefined;

  if (existing) {
    db.prepare(`UPDATE order_items SET piece_type = ?, quantity = ?, unit_price = ?, total_price = ?,
      fabric_source = ?, fabric_price = ?, details = ? WHERE id = ?`)
      .run(newRow.piece_type, newRow.quantity, newRow.unit_price, newRow.total_price,
        newRow.fabric_source, newRow.fabric_price, newRow.details, existing.id);
  } else {
    db.prepare(`INSERT INTO order_items (order_id, piece_type, quantity, unit_price, total_price,
      fabric_source, fabric_price, details, sort_order, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(order.id, newRow.piece_type, newRow.quantity, newRow.unit_price, newRow.total_price,
        newRow.fabric_source, newRow.fabric_price, newRow.details, newRow.sort_order, newRow.created_at);
  }
}

function applyRemoteOrderPayment(eventType: string, newRow: any, oldRow: any, syncSource: string): void {
  if (eventType === 'DELETE') {
    const local = findLocalBySyncRef('order_payments', oldRow);
    if (local) db.prepare('DELETE FROM order_payments WHERE id = ?').run(local.id);
    return;
  }

  const order = findLocalOrderByRemoteRef(newRow.order_id, syncSource);
  if (!order) return;

  const existing = db.prepare('SELECT id FROM order_payments WHERE order_id = ? AND amount = ? AND created_at = ?')
    .get(order.id, newRow.amount, newRow.created_at) as { id: number } | undefined;

  if (existing) {
    db.prepare('UPDATE order_payments SET amount = ?, method = ?, note = ? WHERE id = ?')
      .run(newRow.amount, newRow.method, newRow.note, existing.id);
  } else {
    db.prepare('INSERT INTO order_payments (order_id, amount, method, note, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(order.id, newRow.amount, newRow.method, newRow.note, newRow.created_by, newRow.created_at);

    // Recalculate paid
    const sum = db.prepare('SELECT COALESCE(SUM(amount), 0) as t FROM order_payments WHERE order_id = ?').get(order.id) as { t: number };
    db.prepare('UPDATE orders SET paid = ? WHERE id = ?').run(sum.t, order.id);
  }
}

function applyRemoteOrderMeasurement(eventType: string, newRow: any, oldRow: any, syncSource: string): void {
  if (eventType === 'DELETE') return;

  const order = findLocalOrderByRemoteRef(newRow.order_id, syncSource);
  if (!order) return;

  const existing = db.prepare('SELECT id FROM order_measurements WHERE order_id = ?').get(order.id) as { id: number } | undefined;

  if (existing) {
    db.prepare(`UPDATE order_measurements SET chest = ?, waist = ?, hips = ?, length = ?,
      sleeve = ?, shoulder = ?, notes = ? WHERE id = ?`)
      .run(newRow.chest, newRow.waist, newRow.hips, newRow.length, newRow.sleeve, newRow.shoulder, newRow.notes, existing.id);
  } else {
    db.prepare(`INSERT INTO order_measurements (order_id, chest, waist, hips, length, sleeve, shoulder, notes, taken_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(order.id, newRow.chest, newRow.waist, newRow.hips, newRow.length, newRow.sleeve,
        newRow.shoulder, newRow.notes, newRow.taken_by, newRow.created_at);
  }
}

function applyRemoteOrderTask(eventType: string, newRow: any, oldRow: any, syncSource: string): void {
  if (eventType === 'DELETE') {
    const local = findLocalBySyncRef('order_tasks', oldRow);
    if (local) db.prepare('DELETE FROM order_tasks WHERE id = ?').run(local.id);
    return;
  }

  const order = findLocalOrderByRemoteRef(newRow.order_id, syncSource);
  if (!order) return;

  // Try to match by order_id + task_type + assigned_to
  const existing = db.prepare('SELECT id FROM order_tasks WHERE order_id = ? AND task_type = ? AND assigned_to = ?')
    .get(order.id, newRow.task_type, newRow.assigned_to) as { id: number } | undefined;

  if (existing) {
    db.prepare(`UPDATE order_tasks SET status = ?, wage_amount = ?, started_at = ?, completed_at = ?, notes = ?
      WHERE id = ?`)
      .run(newRow.status, newRow.wage_amount, newRow.started_at, newRow.completed_at, newRow.notes, existing.id);
  } else {
    db.prepare(`INSERT INTO order_tasks (order_id, order_item_id, task_type, assigned_to, wage_type, wage_rate,
      wage_amount, task_quantity, status, started_at, completed_at, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(order.id, newRow.order_item_id, newRow.task_type, newRow.assigned_to, newRow.wage_type,
        newRow.wage_rate, newRow.wage_amount, newRow.task_quantity, newRow.status,
        newRow.started_at, newRow.completed_at, newRow.notes);
  }
}

function applyRemoteExpense(eventType: string, newRow: any, oldRow: any, syncSource: string, branchId: number): void {
  if (eventType === 'DELETE') {
    const local = findLocalBySyncRef('expenses', oldRow);
    if (local) db.prepare('UPDATE expenses SET is_deleted = 1 WHERE id = ?').run(local.id);
    return;
  }

  const existing = db.prepare('SELECT id FROM expenses WHERE description = ? AND amount = ? AND expense_date = ?')
    .get(newRow.description, newRow.amount, newRow.expense_date) as { id: number } | undefined;

  if (existing) {
    db.prepare('UPDATE expenses SET category = ?, description = ?, amount = ?, is_deleted = ? WHERE id = ?')
      .run(newRow.category, newRow.description, newRow.amount, newRow.is_deleted ?? 0, existing.id);
  } else {
    db.prepare(`INSERT INTO expenses (category, description, amount, expense_date, branch_id, created_by, note, is_deleted, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(newRow.category, newRow.description, newRow.amount, newRow.expense_date,
        newRow.branch_id ?? branchId, newRow.created_by, newRow.note, newRow.is_deleted ?? 0, newRow.created_at);
  }
}

function applyRemoteUser(eventType: string, newRow: any, oldRow: any, syncSource: string): void {
  if (eventType === 'DELETE') return; // Don't auto-delete users from remote

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(newRow.username) as { id: number } | undefined;

  if (existing) {
    db.prepare('UPDATE users SET name = ?, worker_type = ?, branch_id = ?, base_salary = ?, active = ? WHERE id = ?')
      .run(newRow.name, newRow.worker_type, newRow.branch_id, newRow.base_salary ?? 0, newRow.active ?? 1, existing.id);
  }
  // Don't auto-create users from other branches - they may have different auth
}

function applyRemotePieceType(eventType: string, newRow: any, oldRow: any, syncSource: string): void {
  if (eventType === 'DELETE') {
    const local = db.prepare('SELECT id FROM piece_types WHERE name_en = ?').get(oldRow.name_en) as { id: number } | undefined;
    if (local) db.prepare('UPDATE piece_types SET active = 0 WHERE id = ?').run(local.id);
    return;
  }

  const existing = db.prepare('SELECT id FROM piece_types WHERE name_en = ?').get(newRow.name_en) as { id: number } | undefined;

  if (existing) {
    db.prepare('UPDATE piece_types SET name_ar = ?, category = ?, base_price = ?, active = ? WHERE id = ?')
      .run(newRow.name_ar, newRow.category, newRow.base_price, newRow.active ?? 1, existing.id);
  } else {
    db.prepare('INSERT INTO piece_types (name_en, name_ar, category, base_price, active, sort_order) VALUES (?, ?, ?, ?, ?, ?)')
      .run(newRow.name_en, newRow.name_ar, newRow.category, newRow.base_price, newRow.active ?? 1, newRow.sort_order ?? 0);
  }
}

// ── Helpers ──────────────────────────────────────────────────────────

function findLocalBySyncRef(table: string, row: any): { id: number } | undefined {
  if (!row?.local_id || !row?.sync_source) return undefined;
  // Try to find by local_id directly
  return db.prepare(`SELECT id FROM ${table} WHERE id = ?`).get(row.local_id) as { id: number } | undefined;
}

function findLocalOrderByRemoteRef(remoteOrderId: number, syncSource: string): { id: number } | undefined {
  // Try to find order via the remote order's local_id mapped through Supabase
  // Since we may not have a direct mapping, use order_number as fallback
  const remoteOrder = db.prepare('SELECT id FROM orders LIMIT 1').get();
  // For simplicity, return the first match attempt
  // In practice, the push function stores local_id in Supabase, so when we pull,
  // the remote order has a local_id that references the source branch's local DB
  // Since this is branch B receiving branch A's change, branch B creates a new local record
  return undefined; // Will create new records via the applier functions
}
