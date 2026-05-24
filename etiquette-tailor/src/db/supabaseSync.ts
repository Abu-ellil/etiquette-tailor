import db from './connection';
import { supabase, type SyncLogEntry } from './supabase';
import { getSetting, setSetting } from './settings';
import { getIsApplyingRemote } from './realtimeSync';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface SyncResult {
  success: boolean;
  pushed?: number;
  pulled?: number;
  errors?: string[];
  lastSyncAt?: string;
}

interface SyncStatus {
  enabled: boolean;
  intervalMinutes: number;
  lastSync: string | null;
  pendingChanges: number;
  syncSource: string;
}

/* ------------------------------------------------------------------ */
/*  Online state (set by connectivity module)                          */
/* ------------------------------------------------------------------ */
let _isOnline = true;

export function setOnlineState(online: boolean): void {
  _isOnline = online;
}

export function isSyncOnline(): boolean {
  return _isOnline;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
export function getSyncSource(): string {
  const branchId = getSetting('active_branch_id') || '1';
  return `branch_${branchId}`;
}

export function getBranchId(): number {
  return parseInt(getSetting('active_branch_id') || '1', 10);
}

/* ------------------------------------------------------------------ */
/*  Sync Logging - Track local changes                                */
/* ------------------------------------------------------------------ */
export function logChange(tableName: string, recordId: number, action: 'INSERT' | 'UPDATE' | 'DELETE', data?: any): void {
  try {
    const stmt = db.prepare(`
      INSERT INTO sync_log (table_name, record_id, action, data, branch_id, synced)
      VALUES (?, ?, ?, ?, ?, 0)
    `);
    const result = stmt.run(tableName, recordId, action, data ? JSON.stringify(data) : null, getBranchId());
    const syncLogId = result.lastInsertRowid as number;

    // Instant push if online and not applying a remote change
    if (_isOnline && !getIsApplyingRemote()) {
      setImmediate(() => {
        flushLatestChange(syncLogId).catch(err => {
          console.error('[sync] instant push failed, will retry on next poll:', err);
        });
      });
    }
  } catch (err) {
    console.error('[sync] Failed to log change:', err);
  }
}

/* ------------------------------------------------------------------ */
/*  Push local changes to Supabase                                    */
/* ------------------------------------------------------------------ */
async function pushChanges(): Promise<number> {
  let totalPushed = 0;

  // Keep pushing batches until all synced
  while (true) {
    const unsynced = db.prepare(`
      SELECT * FROM sync_log WHERE synced = 0 ORDER BY created_at ASC LIMIT 200
    `).all() as SyncLogEntry[];

    if (unsynced.length === 0) break;

    for (const entry of unsynced) {
      try {
        const data = entry.data ? JSON.parse(entry.data) : {};

        switch (entry.table_name) {
          case 'customers':
            await pushCustomer(entry, data);
            break;
          case 'orders':
            await pushOrder(entry, data);
            break;
          case 'order_items':
            await pushOrderItem(entry, data);
            break;
          case 'order_payments':
            await pushOrderPayment(entry, data);
            break;
          case 'order_measurements':
            await pushOrderMeasurement(entry, data);
            break;
          case 'order_tasks':
            await pushOrderTask(entry, data);
            break;
          case 'expenses':
            await pushExpense(entry, data);
            break;
          case 'users':
            await pushUser(entry, data);
            break;
          case 'piece_types':
            await pushPieceType(entry, data);
            break;
        }

        // Mark as synced
        db.prepare('UPDATE sync_log SET synced = 1 WHERE id = ?').run(entry.id);
        totalPushed++;
      } catch (err: any) {
        console.error('[sync] Failed to push entry:', entry.table_name, entry.record_id, err.message);
      }
    }
  }

  // Clean up old synced entries (older than 7 days)
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare('DELETE FROM sync_log WHERE synced = 1 AND created_at < ?').run(weekAgo);

  return totalPushed;
}

/* ------------------------------------------------------------------ */
/*  Instant push - flush a single sync_log entry immediately          */
/* ------------------------------------------------------------------ */
async function flushLatestChange(syncLogId: number): Promise<void> {
  const entry = db.prepare('SELECT * FROM sync_log WHERE id = ?').get(syncLogId) as SyncLogEntry | undefined;
  if (!entry || entry.synced === 1) return;

  const data = entry.data ? JSON.parse(entry.data) : {};

  try {
    switch (entry.table_name) {
      case 'customers': await pushCustomer(entry, data); break;
      case 'orders': await pushOrder(entry, data); break;
      case 'order_items': await pushOrderItem(entry, data); break;
      case 'order_payments': await pushOrderPayment(entry, data); break;
      case 'order_measurements': await pushOrderMeasurement(entry, data); break;
      case 'order_tasks': await pushOrderTask(entry, data); break;
      case 'expenses': await pushExpense(entry, data); break;
      case 'users': await pushUser(entry, data); break;
      case 'piece_types': await pushPieceType(entry, data); break;
    }
    db.prepare('UPDATE sync_log SET synced = 1 WHERE id = ?').run(syncLogId);
  } catch (err) {
    console.error('[sync] flush failed for', syncLogId, err);
  }
}

async function pushCustomer(entry: SyncLogEntry, data: any): Promise<void> {
  const local = db.prepare('SELECT * FROM customers WHERE id = ?').get(entry.record_id) as any;
  if (!local) return;
  const recordBranch = local.branch_id || 1;
  const recordSource = `branch_${recordBranch}`;

  if (entry.action === 'DELETE') {
    await supabase.from('customers').delete().eq('local_id', entry.record_id).eq('sync_source', recordSource);
  } else {
    await supabase.from('customers').upsert({
      local_id: entry.record_id,
      name: local.name,
      phone: local.phone,
      notes: local.notes,
      branch_id: recordBranch,
      sync_source: recordSource,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'local_id,sync_source' });
  }
}

async function pushOrder(entry: SyncLogEntry, data: any): Promise<void> {
  const local = db.prepare('SELECT * FROM orders WHERE id = ?').get(entry.record_id) as any;
  if (!local) return;
  const recordBranch = local.branch_id || 1;
  const recordSource = `branch_${recordBranch}`;

  if (entry.action === 'DELETE') {
    await supabase.from('orders').delete().eq('local_id', entry.record_id).eq('sync_source', recordSource);
  } else {
    const { data: cust } = await supabase
      .from('customers')
      .select('id')
      .eq('local_id', local.customer_id)
      .eq('sync_source', recordSource)
      .single();

    await supabase.from('orders').upsert({
      local_id: entry.record_id,
      order_number: local.order_number,
      branch_id: recordBranch,
      customer_id: cust?.id || local.customer_id,
      piece_type: local.piece_type,
      details: local.details,
      price: local.price,
      paid: local.paid,
      payment_method: local.payment_method,
      status: local.status,
      receive_date: local.receive_date,
      delivery_date: local.delivery_date,
      created_by: local.created_by,
      fabric_source: local.fabric_source,
      sync_source: recordSource,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'local_id,sync_source' });
  }
}

async function getOrderBranch(orderId: number): { branchId: number; source: string } {
  const order = db.prepare('SELECT branch_id FROM orders WHERE id = ?').get(orderId) as { branch_id: number } | undefined;
  const branchId = order?.branch_id || 1;
  return { branchId, source: `branch_${branchId}` };
}

async function pushOrderItem(entry: SyncLogEntry, data: any): Promise<void> {
  const local = db.prepare('SELECT * FROM order_items WHERE id = ?').get(entry.record_id) as any;
  if (!local) return;
  const { source: recordSource } = await getOrderBranch(local.order_id);

  if (entry.action === 'DELETE') {
    await supabase.from('order_items').delete().eq('local_id', entry.record_id).eq('sync_source', recordSource);
  } else {
    const { data: ord } = await supabase
      .from('orders')
      .select('id')
      .eq('local_id', local.order_id)
      .eq('sync_source', recordSource)
      .single();

    await supabase.from('order_items').upsert({
      local_id: entry.record_id,
      order_id: ord?.id || local.order_id,
      piece_type: local.piece_type,
      quantity: local.quantity,
      unit_price: local.unit_price,
      total_price: local.total_price,
      fabric_source: local.fabric_source,
      fabric_price: local.fabric_price,
      details: local.details,
      sort_order: local.sort_order,
      sync_source: recordSource,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'local_id,sync_source' });
  }
}

async function pushOrderPayment(entry: SyncLogEntry, data: any): Promise<void> {
  const local = db.prepare('SELECT * FROM order_payments WHERE id = ?').get(entry.record_id) as any;
  if (!local) return;
  const { source: recordSource } = await getOrderBranch(local.order_id);

  if (entry.action === 'DELETE') {
    await supabase.from('order_payments').delete().eq('local_id', entry.record_id).eq('sync_source', recordSource);
  } else {
    const { data: ord } = await supabase
      .from('orders')
      .select('id')
      .eq('local_id', local.order_id)
      .eq('sync_source', recordSource)
      .single();

    await supabase.from('order_payments').upsert({
      local_id: entry.record_id,
      order_id: ord?.id || local.order_id,
      amount: local.amount,
      method: local.method,
      note: local.note,
      created_by: local.created_by,
      created_at: local.created_at,
      sync_source: recordSource,
    }, { onConflict: 'local_id,sync_source' });
  }
}

async function pushOrderMeasurement(entry: SyncLogEntry, data: any): Promise<void> {
  const local = db.prepare('SELECT * FROM order_measurements WHERE id = ?').get(entry.record_id) as any;
  if (!local) return;
  const { source: recordSource } = await getOrderBranch(local.order_id);

  if (entry.action === 'DELETE') {
    await supabase.from('order_measurements').delete().eq('local_id', entry.record_id).eq('sync_source', recordSource);
  } else {
    const { data: ord } = await supabase
      .from('orders')
      .select('id')
      .eq('local_id', local.order_id)
      .eq('sync_source', recordSource)
      .single();

    await supabase.from('order_measurements').upsert({
      local_id: entry.record_id,
      order_id: ord?.id || local.order_id,
      chest: local.chest,
      waist: local.waist,
      hips: local.hips,
      length: local.length,
      sleeve: local.sleeve,
      shoulder: local.shoulder,
      notes: local.notes,
      taken_by: local.taken_by,
      created_at: local.created_at,
      sync_source: recordSource,
    }, { onConflict: 'local_id,sync_source' });
  }
}

async function pushOrderTask(entry: SyncLogEntry, data: any): Promise<void> {
  const local = db.prepare('SELECT * FROM order_tasks WHERE id = ?').get(entry.record_id) as any;
  if (!local) return;
  const { source: recordSource } = await getOrderBranch(local.order_id);

  if (entry.action === 'DELETE') {
    await supabase.from('order_tasks').delete().eq('local_id', entry.record_id).eq('sync_source', recordSource);
  } else {
    const { data: ord } = await supabase
      .from('orders')
      .select('id')
      .eq('local_id', local.order_id)
      .eq('sync_source', recordSource)
      .single();

    await supabase.from('order_tasks').upsert({
      local_id: entry.record_id,
      order_id: ord?.id || local.order_id,
      order_item_id: local.order_item_id,
      task_type: local.task_type,
      assigned_to: local.assigned_to,
      wage_type: local.wage_type,
      wage_rate: local.wage_rate,
      wage_amount: local.wage_amount,
      task_quantity: local.task_quantity,
      status: local.status,
      started_at: local.started_at,
      completed_at: local.completed_at,
      notes: local.notes,
      sync_source: recordSource,
    }, { onConflict: 'local_id,sync_source' });
  }
}

async function pushExpense(entry: SyncLogEntry, data: any): Promise<void> {
  const local = db.prepare('SELECT * FROM expenses WHERE id = ?').get(entry.record_id) as any;
  if (!local) return;
  const recordBranch = local.branch_id || 1;
  const recordSource = `branch_${recordBranch}`;

  if (entry.action === 'DELETE') {
    await supabase.from('expenses').delete().eq('local_id', entry.record_id).eq('sync_source', recordSource);
  } else {
    await supabase.from('expenses').upsert({
      local_id: entry.record_id,
      category: local.category,
      description: local.description,
      amount: local.amount,
      expense_date: local.expense_date,
      branch_id: recordBranch,
      created_by: local.created_by,
      note: local.note,
      is_deleted: local.is_deleted || 0,
      sync_source: recordSource,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'local_id,sync_source' });
  }
}

async function pushUser(entry: SyncLogEntry, data: any): Promise<void> {
  const local = db.prepare('SELECT * FROM users WHERE id = ?').get(entry.record_id) as any;
  if (!local) return;
  const recordBranch = local.branch_id || 1;
  const recordSource = `branch_${recordBranch}`;

  if (entry.action === 'DELETE') {
    await supabase.from('users').delete().eq('local_id', entry.record_id).eq('sync_source', recordSource);
  } else {
    await supabase.from('users').upsert({
      local_id: entry.record_id,
      name: local.name,
      username: local.username,
      role: local.role,
      worker_type: local.worker_type,
      branch_id: recordBranch,
      base_salary: local.base_salary || 0,
      default_rate: local.default_rate || 0,
      active: local.active ?? 1,
      sync_source: recordSource,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'local_id,sync_source' });
  }
}

async function pushPieceType(entry: SyncLogEntry, data: any): Promise<void> {
  const local = db.prepare('SELECT * FROM piece_types WHERE id = ?').get(entry.record_id) as any;
  if (!local) return;

  if (entry.action === 'DELETE') {
    await supabase.from('piece_types').delete().eq('local_id', entry.record_id);
  } else {
    await supabase.from('piece_types').upsert({
      local_id: entry.record_id,
      name_en: local.name_en,
      name_ar: local.name_ar,
      category: local.category,
      active: local.active ?? 1,
      sort_order: local.sort_order || 0,
      base_price: local.base_price || 0,
      sync_source: 'shared',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'local_id,sync_source' });
  }
}

/* ------------------------------------------------------------------ */
/*  Pull changes from Supabase                                        */
/* ------------------------------------------------------------------ */
async function pullChanges(lastSync: string | null): Promise<number> {
  const syncSource = getSyncSource();
  const branchId = getBranchId();
  let pulled = 0;

  // Pull customers
  const { data: customers } = await supabase
    .from('customers')
    .select('*')
    .neq('sync_source', syncSource);

  for (const cust of customers || []) {
    const existing = db.prepare('SELECT id FROM customers WHERE phone = ? AND branch_id = ?')
      .get(cust.phone, branchId) as { id: number } | undefined;

    if (!existing) {
      const result = db.prepare(`
        INSERT INTO customers (name, phone, notes, branch_id, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(cust.name, cust.phone, cust.notes, cust.branch_id, cust.created_at);
      pulled++;
    }
  }

  // Pull orders
  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .neq('sync_source', syncSource);

  for (const ord of orders || []) {
    const existing = db.prepare('SELECT id FROM orders WHERE order_number = ?')
      .get(ord.order_number) as { id: number } | undefined;

    if (!existing) {
      // Find local customer
      const localCust = db.prepare('SELECT id FROM customers WHERE phone IN (SELECT phone FROM customers WHERE id = ?) LIMIT 1')
        .get(ord.customer_id) as { id: number } | undefined;

      const result = db.prepare(`
        INSERT INTO orders (order_number, branch_id, customer_id, piece_type, details, price, paid, payment_method, status, receive_date, delivery_date, created_by, fabric_source, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        ord.order_number, ord.branch_id, localCust?.id || ord.customer_id, ord.piece_type, ord.details,
        ord.price, ord.paid, ord.payment_method, ord.status, ord.receive_date, ord.delivery_date,
        ord.created_by, ord.fabric_source, ord.created_at
      );
      pulled++;
    }
  }

  // Pull expenses
  const { data: expenses } = await supabase
    .from('expenses')
    .select('*')
    .neq('sync_source', syncSource)
    .eq('is_deleted', 0);

  for (const exp of expenses || []) {
    const existing = db.prepare('SELECT id FROM expenses WHERE local_id = ?')
      .get(exp.local_id) as { id: number } | undefined;

    if (!existing) {
      db.prepare(`
        INSERT INTO expenses (category, description, amount, expense_date, branch_id, created_by, note, is_deleted, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(exp.category, exp.description, exp.amount, exp.expense_date, exp.branch_id,
        exp.created_by, exp.note, exp.is_deleted, exp.created_at);
      pulled++;
    }
  }

  return pulled;
}

/* ------------------------------------------------------------------ */
/*  Main sync function                                                 */
/* ------------------------------------------------------------------ */
export async function performSync(): Promise<SyncResult> {
  try {
    const lastSync = getSetting('supabase_last_sync');

    // Push local changes
    const pushed = await pushChanges();

    // Pull remote changes
    const pulled = await pullChanges(lastSync);

    // Update last sync time
    const now = new Date().toISOString();
    setSetting('supabase_last_sync', now);

    return {
      success: true,
      pushed,
      pulled,
      lastSyncAt: now,
    };
  } catch (err: any) {
    console.error('[sync] Sync failed:', err);
    return {
      success: false,
      errors: [err.message],
    };
  }
}

/* ------------------------------------------------------------------ */
/*  Status                                                             */
/* ------------------------------------------------------------------ */
export function getSyncStatus(): SyncStatus {
  const pending = db.prepare('SELECT COUNT(*) as c FROM sync_log WHERE synced = 0').get() as { c: number };
  return {
    enabled: getSetting('supabase_sync_enabled') === '1',
    intervalMinutes: parseInt(getSetting('supabase_sync_interval_minutes') || '60', 10),
    lastSync: getSetting('supabase_last_sync') || null,
    pendingChanges: pending.c,
    syncSource: getSyncSource(),
  };
}

export function enableSync(): void {
  setSetting('supabase_sync_enabled', '1');
}

export function disableSync(): void {
  setSetting('supabase_sync_enabled', '0');
}

export function setSyncInterval(minutes: number): void {
  setSetting('supabase_sync_interval_minutes', String(minutes));
}

/* ------------------------------------------------------------------ */
/*  Initial Sync - Backfill existing data                              */
/* ------------------------------------------------------------------ */
/**
 * Backfill all existing local data into sync_log for initial sync.
 * Call this once when enabling sync for the first time.
 */
export function backfillExistingData(): { orders: number; customers: number; items: number; tasks: number; payments: number; users: number; pieceTypes: number } {
  const branchId = getBranchId();
  const result = { orders: 0, customers: 0, items: 0, tasks: 0, payments: 0, users: 0, pieceTypes: 0 };

  // Get all records that are not already in sync_log
  const orders = db.prepare(`
    SELECT o.id, o.order_number, o.branch_id, o.customer_id, o.piece_type, o.details,
           o.price, o.paid, o.payment_method, o.status, o.receive_date, o.delivery_date,
           o.created_by, o.fabric_source, o.created_at
    FROM orders o
    WHERE (o.is_deleted = 0 OR o.is_deleted IS NULL)
      AND NOT EXISTS (SELECT 1 FROM sync_log WHERE table_name = 'orders' AND record_id = o.id)
  `).all() as any[];

  const customers = db.prepare(`
    SELECT c.id, c.name, c.phone, c.notes, c.branch_id, c.created_at
    FROM customers c
    WHERE NOT EXISTS (SELECT 1 FROM sync_log WHERE table_name = 'customers' AND record_id = c.id)
  `).all() as any[];

  const items = db.prepare(`
    SELECT oi.id, oi.order_id, oi.piece_type, oi.quantity, oi.unit_price,
           oi.total_price, oi.fabric_source, oi.fabric_price, oi.details, oi.created_at
    FROM order_items oi
    WHERE NOT EXISTS (SELECT 1 FROM sync_log WHERE table_name = 'order_items' AND record_id = oi.id)
  `).all() as any[];

  const tasks = db.prepare(`
    SELECT ot.id, ot.order_id, ot.order_item_id, ot.task_type, ot.assigned_to,
           ot.wage_type, ot.wage_rate, ot.wage_amount, ot.task_quantity, ot.status,
           ot.started_at, ot.completed_at, ot.notes
    FROM order_tasks ot
    WHERE NOT EXISTS (SELECT 1 FROM sync_log WHERE table_name = 'order_tasks' AND record_id = ot.id)
  `).all() as any[];

  const payments = db.prepare(`
    SELECT op.id, op.order_id, op.amount, op.method, op.note, op.created_by, op.created_at
    FROM order_payments op
    WHERE NOT EXISTS (SELECT 1 FROM sync_log WHERE table_name = 'order_payments' AND record_id = op.id)
  `).all() as any[];

  const users = db.prepare(`
    SELECT u.id, u.name, u.username, u.role, u.worker_type, u.branch_id, u.base_salary, u.active, u.created_at
    FROM users u
    WHERE NOT EXISTS (SELECT 1 FROM sync_log WHERE table_name = 'users' AND record_id = u.id)
  `).all() as any[];

  const pieceTypes = db.prepare(`
    SELECT pt.id, pt.name_en, pt.name_ar, pt.category, pt.base_price, pt.active, pt.sort_order
    FROM piece_types pt
    WHERE NOT EXISTS (SELECT 1 FROM sync_log WHERE table_name = 'piece_types' AND record_id = pt.id)
  `).all() as any[];

  const insertLog = db.prepare(`
    INSERT INTO sync_log (table_name, record_id, action, data, branch_id, synced)
    VALUES (?, ?, 'INSERT', ?, ?, 0)
  `);

  const tx = db.transaction(() => {
    // Log orders
    for (const o of orders) {
      insertLog.run('orders', o.id, JSON.stringify(o), branchId);
      result.orders++;
    }
    // Log customers
    for (const c of customers) {
      insertLog.run('customers', c.id, JSON.stringify(c), branchId);
      result.customers++;
    }
    // Log order items
    for (const i of items) {
      insertLog.run('order_items', i.id, JSON.stringify(i), branchId);
      result.items++;
    }
    // Log tasks
    for (const t of tasks) {
      insertLog.run('order_tasks', t.id, JSON.stringify(t), branchId);
      result.tasks++;
    }
    // Log payments
    for (const p of payments) {
      insertLog.run('order_payments', p.id, JSON.stringify(p), branchId);
      result.payments++;
    }
    // Log users
    for (const u of users) {
      insertLog.run('users', u.id, JSON.stringify(u), branchId);
      result.users++;
    }
    // Log piece types
    for (const pt of pieceTypes) {
      insertLog.run('piece_types', pt.id, JSON.stringify(pt), branchId);
      result.pieceTypes++;
    }
  });
  tx();

  console.log('[sync] Backfilled existing data:', result);
  return result;
}
