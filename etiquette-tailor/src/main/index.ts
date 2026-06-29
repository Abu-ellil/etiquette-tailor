import { app, BrowserWindow, ipcMain, shell, autoUpdater, dialog } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import started from 'electron-squirrel-startup';
import nodemailer from 'nodemailer';
import { initializeSchema } from '../db/schema';
import db, { isDbReady, getInitError, checkIntegrity, getDbPath } from '../db/connection';
import {
  authenticateUser,
  getAllUsers,
  createUser,
  updateUser,
  deactivateUser,
} from '../db/auth';
import {
  getAllBranches,
  getBranchById,
} from '../db/branches';
import {
  searchCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerOrders,
  getCustomerOutstandingOrders,
  getAllCustomers,
} from '../db/customers';
import {
  getAllOrders,
  getOrder,
  searchOrders,
  createOrder,
  createOrderWithTasks,
  WorkflowPayload,
  updateOrder,
  updateOrderStatus,
  getOrderMeasurements,
  updateOrderMeasurements,
  getOrderTasks,
  createOrderTask,
  updateTaskStatus,
  reassignTask,
  getOrderStats,
  getAllTasks,
  getPaymentSplit,
  getMonthlyRevenue,
  getRecentOrders,
  getDailyStats,
  getWorkerContribution,
  getAdvancedReport,
  getSetting,
  getAllSettings,
  setSetting,
  getOrderItems,
  createOrderItem,
  updateOrderItem,
  deleteOrderItem,
  recalculateOrderTotal,
  addOrderPayment,
  getOrderPayments,
  deleteOrderPayment,
  saveReportEmail,
  getReportEmails,
  deleteReportEmail,
  getBranchIntegrityReport,
  restoreDefaultPieceTypes,
} from '../db';
import {
  createExpense,
  getExpenses,
  deleteExpense,
  getProfitReport,
} from '../db/expenses';
import {
  createNotification,
  getNotificationsForUser,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  softDeleteNotification,
  clearReadNotifications,
  generateOverdueNotifications,
} from '../db/notifications';
import { createBackup, restoreBackup, listLocalBackups, getLastBackupDate, getDbFileSize } from '../db/backup';
import { syncAllOrderPayments } from '../db/orders';
import { performSync, getSyncStatus as getSupabaseSyncStatus, enableSync, disableSync, setSyncInterval, backfillExistingData, setOnlineState, uploadExternalDatabase } from '../db/supabaseSync';
import { subscribeToRemoteChanges, unsubscribeFromRemoteChanges } from '../db/realtimeSync';
import { performUndo, performRedo, getUndoRedoState } from '../db/undoRedo';
import { isOnline, startConnectivityCheck, stopConnectivityCheck, onConnectivityChange } from './connectivity';
import {
  getPieceTypes,
  updateBasePrice,
  getBasePrice,
  createPieceType,
  updatePieceType,
  deletePieceType,
  restoreDefaultPieceTypes,
} from '../db/pieceTypes';

function saveSession(session: any) {
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('saved_session', ?)").run(JSON.stringify(session));
}

function loadSession(): any | null {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'saved_session'").get() as { value: string } | undefined;
  return row ? JSON.parse(row.value) : null;
}

function clearSession() {
  db.prepare("DELETE FROM settings WHERE key = 'saved_session'").run();
}

let currentSession: {
  userId: number;
  username: string;
  name: string;
  role: string;
  branch_id: number;
  worker_type?: string | null;
} | null = null;

if (started) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;

// Auto-sync
let autoSyncTimer: NodeJS.Timeout | null = null;
let isShuttingDown = false;

// Safe logging that won't throw EPIPE during shutdown
function safeLog(...args: unknown[]): void {
  if (!isShuttingDown) {
    try {
      console.log(...args);
    } catch {
      // Ignore errors during shutdown
    }
  }
}

function safeError(...args: unknown[]): void {
  if (!isShuttingDown) {
    try {
      console.error(...args);
    } catch {
      // Ignore errors during shutdown
    }
  }
}

function currentBranchId(): number {
  return currentSession?.branch_id || 1;
}

// ── Branch isolation guards ──────────────────────────────────────────────
// The main process is the only trust boundary for branch isolation. The
// renderer's branch arguments are ignored for all branch-scoped operations;
// the session's branch_id is the single source of truth.

/** Returns the authenticated session's branch, throwing if logged out. */
function requireBranch(): number {
  if (!currentSession) {
    throw new Error('Not authenticated');
  }
  return currentSession.branch_id;
}

class BranchAccessError extends Error {
  constructor(resource: string, id: number) {
    super(`${resource} ${id} does not belong to your branch`);
    this.name = 'BranchAccessError';
  }
}

function assertOrderInBranch(orderId: number, branchId: number): void {
  const row = db.prepare('SELECT branch_id FROM orders WHERE id = ?').get(orderId) as { branch_id: number } | undefined;
  if (!row || row.branch_id !== branchId) {
    throw new BranchAccessError('Order', orderId);
  }
}

function assertOrderTaskInBranch(taskId: number, branchId: number): void {
  const row = db.prepare('SELECT o.branch_id FROM order_tasks ot JOIN orders o ON ot.order_id = o.id WHERE ot.id = ?').get(taskId) as { branch_id: number } | undefined;
  if (!row || row.branch_id !== branchId) {
    throw new BranchAccessError('Task', taskId);
  }
}

function assertCustomerInBranch(customerId: number, branchId: number): void {
  // Customers with NULL branch_id predate branch isolation and are adoptable by
  // whichever branch first operates on them. A customer assigned to a DIFFERENT
  // branch is rejected to keep branches isolated.
  const row = db.prepare('SELECT branch_id FROM customers WHERE id = ?').get(customerId) as { branch_id: number | null } | undefined;
  if (!row || (row.branch_id !== null && row.branch_id !== branchId)) {
    throw new BranchAccessError('Customer', customerId);
  }
}

/** If a customer has no branch assigned (pre-isolation data), claim it for this branch. */
function adoptCustomerIntoBranch(customerId: number, branchId: number): void {
  db.prepare('UPDATE customers SET branch_id = ? WHERE id = ? AND branch_id IS NULL').run(branchId, customerId);
}

function assertUserInBranch(userId: number, branchId: number): void {
  const row = db.prepare('SELECT branch_id FROM users WHERE id = ?').get(userId) as { branch_id: number } | undefined;
  if (!row || row.branch_id !== branchId) {
    throw new BranchAccessError('User', userId);
  }
}

/** Non-throwing membership check used for filtering result sets. */
function isWorkerInBranch(userId: number, branchId: number): boolean {
  const row = db.prepare('SELECT branch_id FROM users WHERE id = ?').get(userId) as { branch_id: number } | undefined;
  return !!row && row.branch_id === branchId;
}

function assertExpenseInBranch(expenseId: number, branchId: number): void {
  // Expenses with NULL branch_id are treated as shared/global and are readable
  // from any branch; branch-specific expenses must match the caller's branch.
  const row = db.prepare('SELECT branch_id FROM expenses WHERE id = ?').get(expenseId) as { branch_id: number | null } | undefined;
  if (!row) {
    throw new BranchAccessError('Expense', expenseId);
  }
  if (row.branch_id !== null && row.branch_id !== branchId) {
    throw new BranchAccessError('Expense', expenseId);
  }
}

function startSupabaseSyncLoop(): void {
  if (autoSyncTimer) {
    safeLog('[supabase-sync] already running');
    return;
  }

  const intervalMinutes = parseInt(getSetting('supabase_sync_interval_minutes') || '60', 10);
  const intervalMs = intervalMinutes * 60 * 1000;

  if (getSetting('supabase_sync_enabled') !== '1') {
    safeLog('[supabase-sync] disabled, skipping');
    return;
  }

  safeLog(`[supabase-sync] starting with interval ${intervalMinutes}min`);

  const doSync = async () => {
    // Skip if app is shutting down
    if (isShuttingDown) return;

    if (getSetting('supabase_sync_enabled') !== '1') {
      safeLog('[supabase-sync] disabled, stopping loop');
      stopSupabaseSyncLoop();
      return;
    }

    try {
      safeLog('[supabase-sync] cycle start');
      const result = await performSync();
      if (result.success) {
        safeLog(`[supabase-sync] pushed: ${result.pushed}, pulled: ${result.pulled}`);
        mainWindow?.webContents.send('sync:completed', {
          success: true,
          pushed: result.pushed,
          pulled: result.pulled,
        });
      } else {
        safeError('[supabase-sync] error:', result.errors);
      }
    } catch (err) {
      safeError('[supabase-sync] error:', err);
    }
  };

  doSync();
  autoSyncTimer = setInterval(doSync, intervalMs);
}

function stopSupabaseSyncLoop(): void {
  if (autoSyncTimer) {
    clearInterval(autoSyncTimer);
    autoSyncTimer = null;
  }
}

function restartSupabaseSyncLoop(): void {
  stopSupabaseSyncLoop();
  if (getSetting('supabase_sync_enabled') === '1') {
    startSupabaseSyncLoop();
  }
}

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    frame: false,
    icon: path.join(__dirname, '../../icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
};

function registerIpcHandlers() {
  ipcMain.handle('auth:login', async (_event, username: string, password: string, remember?: boolean) => {
    const session = authenticateUser(username, password);
    if (session) {
      currentSession = session;
      if (remember) {
        saveSession(session);
      } else {
        clearSession();
      }
    }
    return session;
  });

  ipcMain.handle('auth:getSession', async () => {
    if (currentSession) return currentSession;
    // Restore from DB
    const saved = loadSession();
    if (saved) {
      // Verify user still exists and is active
      const user = db.prepare('SELECT id, active FROM users WHERE id = ?').get(saved.userId) as any;
      if (user && user.active) {
        currentSession = saved;
        return saved;
      }
      // User deactivated or deleted — clear stored session
      clearSession();
    }
    return null;
  });

  ipcMain.handle('auth:logout', async () => {
    currentSession = null;
    clearSession();
  });

  ipcMain.handle('auth:setBranch', async (_event, branchId: number) => {
    if (!currentSession) throw new Error('Not authenticated');
    currentSession.branch_id = branchId;
    const saved = loadSession();
    if (saved) {
      saveSession({ ...saved, branch_id: branchId });
    }
    return true;
  });

  ipcMain.handle('branches:getAll', async () => {
    return getAllBranches();
  });

  ipcMain.handle('branches:getById', async (_event, id: number) => {
    if (id !== requireBranch()) throw new BranchAccessError('Branch', id);
    return getBranchById(id);
  });

  ipcMain.handle('users:getAll', async () => {
    // Full isolation: only the session branch's users are visible
    return getAllUsers(requireBranch());
  });

  ipcMain.handle('users:create', async (_event, data: any) => {
    // Force-stamp branch from session; ignore any client-supplied branch_id
    return createUser({ ...data, branch_id: requireBranch() });
  });

  ipcMain.handle('users:update', async (_event, id: number, data: any) => {
    const branchId = requireBranch();
    assertUserInBranch(id, branchId);
    // Never let an edit move a user into another branch
    return updateUser(id, { ...data, branch_id: branchId });
  });

  ipcMain.handle('users:deactivate', async (_event, id: number) => {
    assertUserInBranch(id, requireBranch());
    return deactivateUser(id);
  });

  ipcMain.handle('workers:getAll', async () => {
    return getAllWorkers(requireBranch());
  });

  ipcMain.handle('workers:getRates', async (_event, userId: number) => {
    assertUserInBranch(userId, requireBranch());
    return getWorkerRates(userId);
  });

  ipcMain.handle('workers:setRate', async (_event, rate: any) => {
    assertUserInBranch(rate.user_id, requireBranch());
    return setWorkerRate(rate);
  });

  ipcMain.handle('workers:getActiveRate', async (_event, userId: number, pieceType: string) => {
    assertUserInBranch(userId, requireBranch());
    return getActiveRate(userId, pieceType);
  });

  ipcMain.handle('workers:getWorkerTasks', async (_event, userId: number) => {
    assertUserInBranch(userId, requireBranch());
    return getWorkerTasks(userId);
  });

  ipcMain.handle('workers:getMonthlyEarnings', async (_event, userId: number, month: string) => {
    assertUserInBranch(userId, requireBranch());
    return getMonthlyEarnings(userId, month);
  });

  ipcMain.handle('workers:getWorkerOrderDetails', async (_event, userId: number, startDate: string, endDate: string) => {
    assertUserInBranch(userId, requireBranch());
    return getWorkerOrderDetails(userId, startDate, endDate);
  });

  ipcMain.handle('workers:getAccount', async (_event, userId: number) => {
    assertUserInBranch(userId, requireBranch());
    return getWorkerAccount(userId);
  });

  ipcMain.handle('workers:addPayment', async (_event, userId: number, amount: number, note: string | null) => {
    assertUserInBranch(userId, requireBranch());
    return addWorkerPayment(userId, amount, note, currentSession?.userId ?? null);
  });

  ipcMain.handle('workers:getPayments', async (_event, userId: number) => {
    assertUserInBranch(userId, requireBranch());
    return getWorkerPayments(userId);
  });

  ipcMain.handle('workers:getWorkerEarnings', async (_event, userId: number, startDate: string, endDate: string) => {
    assertUserInBranch(userId, requireBranch());
    return getWorkerEarnings(userId, startDate, endDate);
  });

  ipcMain.handle('workers:batchPayments', async (_event, payments: Array<{userId: number; amount: number; note: string | null}>) => {
    // Validate every payment targets a worker in the session branch
    const branchId = requireBranch();
    for (const p of payments) {
      assertUserInBranch(p.userId, branchId);
    }
    return batchWorkerPayments(payments, currentSession?.userId ?? null);
  });

  ipcMain.handle('workers:getProductivity', async (_event, _branchId?: number, startDate?: string, endDate?: string) => {
    return getAllWorkerProductivity(requireBranch(), startDate, endDate);
  });

  ipcMain.handle('workers:getOverdueTasks', async (_event, _branchId?: number) => {
    return getOverdueTasks(requireBranch());
  });

  ipcMain.handle('workers:getWorkloads', async (_event, _branchId?: number) => {
    return getWorkerWorkloads(requireBranch());
  });

  ipcMain.handle('workers:getRecommended', async (_event, pieceType: string, taskType: string) => {
    return getRecommendedWorkers(requireBranch(), pieceType, taskType);
  });

  // Daily Production handlers
  ipcMain.handle('dailyProduction:create', async (_event, data: any) => {
    const branchId = requireBranch();
    // Ensure the selected worker belongs to the session branch
    if (data.worker_id) {
      assertUserInBranch(data.worker_id, branchId);
    }
    return createDailyProduction({
      ...data,
      created_by: currentSession?.userId ?? null,
    });
  });

  ipcMain.handle('dailyProduction:getAll', async (_event, filters?: { worker_id?: number; start_date?: string; end_date?: string }) => {
    const branchId = requireBranch();
    const records = getDailyProduction(filters);
    // Filter to only this branch's workers
    return records.filter((r: any) => r.worker_id != null && isWorkerInBranch(r.worker_id, branchId));
  });

  ipcMain.handle('dailyProduction:getByDate', async (_event, date: string) => {
    const branchId = requireBranch();
    const records = getDailyProductionByDate(date);
    return records.filter((r: any) => r.worker_id != null && isWorkerInBranch(r.worker_id, branchId));
  });

  ipcMain.handle('dailyProduction:getWorkerSummary', async (_event, workerId: number, startDate: string, endDate: string) => {
    assertUserInBranch(workerId, requireBranch());
    return getWorkerProductionSummary(workerId, startDate, endDate);
  });

  ipcMain.handle('dailyProduction:getAllWorkersProduction', async (_event, startDate: string, endDate: string) => {
    const branchId = requireBranch();
    const records = getAllWorkersProduction(startDate, endDate);
    return records.filter((r: any) => r.worker_id != null && isWorkerInBranch(r.worker_id, branchId));
  });

  ipcMain.handle('dailyProduction:getGrouped', async (_event, startDate: string, endDate: string) => {
    const branchId = requireBranch();
    const records = getDailyProductionGrouped(startDate, endDate);
    return records.filter((r: any) => r.worker_id != null && isWorkerInBranch(r.worker_id, branchId));
  });

  ipcMain.handle('dailyProduction:delete', async (_event, id: number) => {
    // Verify the production record belongs to a worker in this branch
    const row = db.prepare('SELECT worker_id FROM daily_production WHERE id = ?').get(id) as { worker_id: number } | undefined;
    if (!row) throw new Error('Production record not found');
    assertUserInBranch(row.worker_id, requireBranch());
    return deleteDailyProduction(id);
  });

  ipcMain.handle('dailyProduction:update', async (_event, id: number, data: any) => {
    const branchId = requireBranch();
    const row = db.prepare('SELECT worker_id FROM daily_production WHERE id = ?').get(id) as { worker_id: number } | undefined;
    if (!row) throw new Error('Production record not found');
    assertUserInBranch(row.worker_id, branchId);
    if (data.worker_id) assertUserInBranch(data.worker_id, branchId);
    return updateDailyProduction(id, data);
  });

  ipcMain.handle('customers:getAll', async () => {
    return getAllCustomers(requireBranch());
  });

  ipcMain.handle('customers:search', async (_event, query: string) => {
    return searchCustomers(query, requireBranch());
  });

  ipcMain.handle('customers:create', async (_event, data: any) => {
    // Force-stamp branch from session; ignore client-supplied branch_id
    return createCustomer({ ...data, branch_id: requireBranch() });
  });

  ipcMain.handle('customers:update', async (_event, id: number, data: any) => {
    assertCustomerInBranch(id, requireBranch());
    return updateCustomer(id, data);
  });

  ipcMain.handle('customers:delete', async (_event, id: number) => {
    assertCustomerInBranch(id, requireBranch());
    return deleteCustomer(id);
  });

  ipcMain.handle('customers:getOutstandingOrders', async (_event, customerId: number) => {
    assertCustomerInBranch(customerId, requireBranch());
    return getCustomerOutstandingOrders(customerId);
  });

  ipcMain.handle('customers:getOrders', async (_event, customerId: number) => {
    assertCustomerInBranch(customerId, requireBranch());
    return getCustomerOrders(customerId);
  });

  ipcMain.handle('orders:getAll', async (_event, _branchId?: number, status?: string) => {
    return getAllOrders(requireBranch(), status);
  });

  ipcMain.handle('orders:get', async (_event, id: number) => {
    assertOrderInBranch(id, requireBranch());
    return getOrder(id);
  });

  ipcMain.handle('orders:search', async (_event, query: string) => {
    return searchOrders(query, requireBranch());
  });

  ipcMain.handle('orders:create', async (_event, data: any, measurements?: any, items?: any) => {
    // Force-stamp branch from session; ignore client-supplied branch_id
    const branchId = requireBranch();
    // Validate + adopt the customer: a NULL-branch customer (pre-isolation) is
    // claimed by this branch; a customer in a different branch is rejected.
    if (data.customer_id) {
      assertCustomerInBranch(data.customer_id, branchId);
      adoptCustomerIntoBranch(data.customer_id, branchId);
    }
    const result = createOrder({ ...data, branch_id: branchId }, measurements, items);
    try {
      const orderId = typeof result === 'object' ? result.id : result;
      const order = getOrder(orderId);
      if (order) {
        const msg = `Order ${order.order_number} created for ${data.customer_name || 'customer'}`;
        createNotification({ type: 'order_created', title: 'New Order', message: msg, order_id: orderId, target_role: 'admin', branch_id: branchId });
        createNotification({ type: 'order_created', title: 'New Order', message: msg, order_id: orderId, target_role: 'manager', branch_id: branchId });
      }
    } catch (e) { safeError('Notification error:', e); }
    return result;
  });

  ipcMain.handle('orders:createWithTasks', (_e, payload) => {
    // Force-stamp branch from session; ignore client-supplied branch_id
    const branchId = requireBranch();
    // Validate all assigned workers belong to the session branch
    for (const item of payload.items || []) {
      if (item.cutter_id) assertUserInBranch(item.cutter_id, branchId);
      for (const t of item.tailors || []) {
        assertUserInBranch(t.worker_id, branchId);
      }
    }
    if (payload.customer_id) {
      assertCustomerInBranch(payload.customer_id, branchId);
      adoptCustomerIntoBranch(payload.customer_id, branchId);
    }
    return createOrderWithTasks({ ...payload, branch_id: branchId });
  });

  ipcMain.handle('orders:update', async (_event, id: number, data: any) => {
    const branchId = requireBranch();
    assertOrderInBranch(id, branchId);
    // Never let an edit move an order into another branch
    return updateOrder(id, { ...data, branch_id: branchId });
  });

  ipcMain.handle('orders:updateStatus', async (_event, id: number, status: string) => {
    const branchId = requireBranch();
    assertOrderInBranch(id, branchId);
    const result = updateOrderStatus(id, status);
    try {
      const order = getOrder(id);
      if (order) {
        const msg = `Order ${order.order_number} is now "${status}"`;
        createNotification({ type: 'order_status_changed', title: 'Order Status Updated', message: msg, order_id: id, target_role: 'admin', branch_id: branchId });
        createNotification({ type: 'order_status_changed', title: 'Order Status Updated', message: msg, order_id: id, target_role: 'manager', branch_id: branchId });
        const tasks = getOrderTasks(id);
        for (const task of tasks) {
          if (task.assigned_to) {
            createNotification({ type: 'order_status_changed', title: 'Order Status Changed', message: msg, order_id: id, task_id: task.id, target_user_id: task.assigned_to, branch_id: branchId });
          }
        }
      }
    } catch (e) { safeError('Notification error:', e); }
    return result;
  });

  ipcMain.handle('orders:delete', async (_event, orderId: number) => {
    assertOrderInBranch(orderId, requireBranch());
    return updateOrder(orderId, { is_deleted: 1 });
  });

  ipcMain.handle('orders:getMeasurements', async (_event, orderId: number) => {
    assertOrderInBranch(orderId, requireBranch());
    return getOrderMeasurements(orderId);
  });

  ipcMain.handle('orders:updateMeasurements', async (_event, orderId: number, measurements: any) => {
    assertOrderInBranch(orderId, requireBranch());
    return updateOrderMeasurements(orderId, measurements);
  });

  ipcMain.handle('orders:getTasks', async (_event, orderId: number) => {
    assertOrderInBranch(orderId, requireBranch());
    return getOrderTasks(orderId);
  });

  ipcMain.handle('orders:createTask', async (_event, data: any) => {
    assertOrderInBranch(data.order_id, requireBranch());
    return createOrderTask(data);
  });

  ipcMain.handle('orders:updateTaskStatus', async (_event, taskId: number, status: string) => {
    const branchId = requireBranch();
    assertOrderTaskInBranch(taskId, branchId);
    // Worker permission check: only allow updating tasks matching their type
    if (currentSession?.role === 'worker') {
      const task = db.prepare('SELECT task_type FROM order_tasks WHERE id = ?').get(taskId) as any;
      if (task) {
        const allowedType: Record<string, string> = { master_cutter: 'cutting', tailor: 'sewing' };
        const expected = allowedType[currentSession.worker_type || ''];
        if (!expected || task.task_type !== expected) {
          throw new Error('You are not authorized to update this task type');
        }
      }
    }
    const result = updateTaskStatus(taskId, status);
    try {
      const tasks = db.prepare('SELECT * FROM order_tasks WHERE id = ?').get(taskId) as any;
      if (tasks) {
        const order = getOrder(tasks.order_id);
        if (order) {
          const msg = `${tasks.task_type} task on order ${order.order_number} is now "${status}"`;
          createNotification({ type: 'task_status_changed', title: 'Task Updated', message: msg, order_id: tasks.order_id, task_id: taskId, target_role: 'admin', branch_id: branchId });
          createNotification({ type: 'task_status_changed', title: 'Task Updated', message: msg, order_id: tasks.order_id, task_id: taskId, target_role: 'manager', branch_id: branchId });
        }
      }
    } catch (e) { safeError('Notification error:', e); }
    return result;
  });

  ipcMain.handle('orders:reassignTask', async (_event, taskId: number, newUserId: number, wageType: string, wageRate: number, wageAmount: number) => {
    const branchId = requireBranch();
    assertOrderTaskInBranch(taskId, branchId);
    // Target worker must also be in the session branch
    assertUserInBranch(newUserId, branchId);
    return reassignTask(taskId, newUserId, wageType, wageRate, wageAmount);
  });

  ipcMain.handle('orders:getStats', async (_event, _branchId?: number) => {
    return getOrderStats(requireBranch());
  });

  ipcMain.handle('reports:getStats', async (_event, _branchId?: number, period?: string) => {
    return getReportStats(requireBranch(), period);
  });

  ipcMain.handle('reports:getPaymentSplit', async (_event, _branchId?: number, period?: string) => {
    return getPaymentSplit(requireBranch(), period);
  });

  ipcMain.handle('reports:getMonthlyRevenue', async (_event, months?: number, _branchId?: number) => {
    return getMonthlyRevenue(months, requireBranch());
  });

  ipcMain.handle('reports:getRecentOrders', async (_event, limit?: number, _branchId?: number, period?: string) => {
    return getRecentOrders(limit, requireBranch(), period);
  });

  ipcMain.handle('reports:getAdvanced', async (_event, filter: any) => {
    return getAdvancedReport({ ...filter, branchId: requireBranch() });
  });

  ipcMain.handle('reports:getDailyStats', async (_event, days: number, _branchId?: number) => {
    return getDailyStats(days, requireBranch());
  });

  ipcMain.handle('reports:getWorkerContribution', async (_event, _branchId?: number, startDate?: string, endDate?: string) => {
    return getWorkerContribution(requireBranch(), startDate, endDate);
  });

  // Branch Integrity scan — read-only diagnostic, admin-only.
  // Scans ALL branches (not just the session branch) so an admin can see cross-branch
  // data-integrity issues. This is the one intentional global read in the app.
  ipcMain.handle('reports:getBranchIntegrity', async () => {
    if (currentSession?.role !== 'admin') {
      throw new Error('Only admins can run the branch integrity scan');
    }
    return getBranchIntegrityReport();
  });

  ipcMain.handle('reports:exportPDF', async (_event, htmlContent: string, filename: string) => {
    const pdfFilename = filename.replace(/\.html$/i, '.pdf');
    const filePath = path.join(os.tmpdir(), pdfFilename);
    const htmlPath = path.join(os.tmpdir(), filename.replace(/\.html$/i, '-temp.html'));
    fs.writeFileSync(htmlPath, htmlContent, 'utf-8');

    const pdfWin = new BrowserWindow({
      width: 800,
      height: 1100,
      show: false,
      webPreferences: { offscreen: true as any },
    });

    await pdfWin.loadFile(htmlPath);
    const pdfData = await pdfWin.webContents.printToPDF({
      pageSize: 'A4',
      printBackground: true,
    });
    pdfWin.close();

    fs.writeFileSync(filePath, pdfData);
    try { fs.unlinkSync(htmlPath); } catch { /* ignore */ }
    await shell.openPath(filePath);
    return filePath;
  });

  ipcMain.handle('reports:sendEmail', async (_event, to: string, subject: string, body: string, htmlContent?: string, filename?: string) => {
    const settings = getAllSettings();

    if (settings.smtp_host && settings.smtp_user && settings.smtp_pass) {
      let pdfBuffer: Buffer | null = null;

      if (htmlContent) {
        const pdfFilename = (filename || 'report.pdf').replace(/\.html$/i, '.pdf');
        const htmlPath = path.join(os.tmpdir(), pdfFilename.replace('.pdf', '-email-temp.html'));
        fs.writeFileSync(htmlPath, htmlContent, 'utf-8');

        const pdfWin = new BrowserWindow({
          width: 800,
          height: 1100,
          show: false,
          webPreferences: { offscreen: true as any },
        });

        await pdfWin.loadFile(htmlPath);
        const pdfData = await pdfWin.webContents.printToPDF({
          pageSize: 'A4',
          printBackground: true,
        });
        pdfWin.close();
        try { fs.unlinkSync(htmlPath); } catch { /* ignore */ }

        pdfBuffer = Buffer.from(pdfData);
      }

      const port = parseInt(settings.smtp_port || '587');
      const secure = settings.smtp_secure === 'ssl' ? true : port === 465;

      const transporter = nodemailer.createTransport({
        host: settings.smtp_host,
        port,
        secure,
        auth: {
          user: settings.smtp_user,
          pass: settings.smtp_pass,
        },
      });

      const mailOptions: nodemailer.SendMailOptions = {
        from: settings.smtp_from_name
          ? `"${settings.smtp_from_name}" <${settings.smtp_from || settings.smtp_user}>`
          : settings.smtp_from || settings.smtp_user,
        to,
        subject,
        text: body,
      };

      if (pdfBuffer) {
        const attachmentName = (filename || 'report.pdf').replace(/\.html$/i, '.pdf');
        mailOptions.attachments = [{
          filename: attachmentName,
          content: pdfBuffer,
          contentType: 'application/pdf',
        }];
      }

      await transporter.sendMail(mailOptions);
      return { sent: true, method: 'smtp' };
    }

    const encodedSubject = encodeURIComponent(subject);
    const encodedBody = encodeURIComponent(body);
    await shell.openExternal(`mailto:${to}?subject=${encodedSubject}&body=${encodedBody}`);
    return { sent: true, method: 'mailto' };
  });

  ipcMain.handle('reports:saveEmail', async (_event, email: string, label?: string) => {
    return saveReportEmail(email, label);
  });

  ipcMain.handle('reports:getEmails', async () => {
    return getReportEmails();
  });

  ipcMain.handle('reports:deleteEmail', async (_event, id: number) => {
    return deleteReportEmail(id);
  });

  ipcMain.handle('orders:getAllTasks', async (_event, filters?: { branchId?: number; workerId?: number; taskType?: string }) => {
    return getAllTasks({ ...filters, branchId: requireBranch() });
  });

  ipcMain.handle('orders:recalculateTaskWages', async (_event, orderId: number, newPrice: number) => {
    assertOrderInBranch(orderId, requireBranch());
    return recalculateTaskWages(orderId, newPrice);
  });

  ipcMain.handle('orders:addPayment', async (_event, orderId: number, amount: number, method: 'cash' | 'card', note: string | null) => {
    const branchId = requireBranch();
    assertOrderInBranch(orderId, branchId);
    const result = addOrderPayment(orderId, amount, method, note, currentSession?.userId ?? null);
    try {
      const order = getOrder(orderId);
      if (order) {
        const msg = `${amount} ${getAllSettings().currency || 'QAR'} ${method} payment on order ${order.order_number}`;
        createNotification({ type: 'payment_received', title: 'Payment Received', message: msg, order_id: orderId, target_role: 'admin', branch_id: branchId });
        createNotification({ type: 'payment_received', title: 'Payment Received', message: msg, order_id: orderId, target_role: 'manager', branch_id: branchId });
      }
    } catch (e) { safeError('Notification error:', e); }
    return result;
  });

  ipcMain.handle('orders:getPayments', async (_event, orderId: number) => {
    assertOrderInBranch(orderId, requireBranch());
    return getOrderPayments(orderId);
  });

  ipcMain.handle('orders:deletePayment', async (_event, paymentId: number) => {
    // Resolve payment → order → branch and verify ownership
    const row = db.prepare('SELECT order_id FROM order_payments WHERE id = ?').get(paymentId) as { order_id: number } | undefined;
    if (!row) throw new Error('Payment not found');
    assertOrderInBranch(row.order_id, requireBranch());
    return deleteOrderPayment(paymentId);
  });

  // Order Items
  ipcMain.handle('orders:getItems', async (_event, orderId: number) => {
    assertOrderInBranch(orderId, requireBranch());
    return getOrderItems(orderId);
  });

  ipcMain.handle('orders:createItem', async (_event, data: any) => {
    assertOrderInBranch(data.order_id, requireBranch());
    return createOrderItem(data);
  });

  ipcMain.handle('orders:updateItem', async (_event, id: number, data: any) => {
    const branchId = requireBranch();
    const row = db.prepare('SELECT order_id FROM order_items WHERE id = ?').get(id) as { order_id: number } | undefined;
    if (!row) throw new Error('Order item not found');
    assertOrderInBranch(row.order_id, branchId);
    return updateOrderItem(id, data);
  });

  ipcMain.handle('orders:deleteItem', async (_event, id: number) => {
    const row = db.prepare('SELECT order_id FROM order_items WHERE id = ?').get(id) as { order_id: number } | undefined;
    if (!row) throw new Error('Order item not found');
    assertOrderInBranch(row.order_id, requireBranch());
    return deleteOrderItem(id);
  });

  ipcMain.handle('orders:recalculateTotal', async (_event, orderId: number) => {
    assertOrderInBranch(orderId, requireBranch());
    return recalculateOrderTotal(orderId);
  });

  // Settings
  ipcMain.handle('settings:getAll', async () => {
    return getAllSettings();
  });

  ipcMain.handle('settings:set', async (_event, settings: Record<string, string>) => {
    return setSettings(settings);
  });

  // Branch management — under full isolation, admins can only update their own branch.
  // Branch creation is intentionally NOT exposed via IPC (use the DB bootstrap/migration path).
  ipcMain.handle('branches:update', async (_event, id: number, data: any) => {
    if (id !== requireBranch()) throw new BranchAccessError('Branch', id);
    return updateBranch(id, data);
  });

  ipcMain.handle('branches:create', async (_event, data: any) => {
    return createBranch(data);
  });

  // Backup & Restore
  ipcMain.handle('db:health', async () => {
    if (!isDbReady()) {
      return { ok: false, error: getInitError() };
    }
    return checkIntegrity();
  });

  ipcMain.handle('backup:create', async () => {
    return createBackup(mainWindow ?? undefined);
  });

  ipcMain.handle('backup:restore', async () => {
    return restoreBackup(mainWindow ?? undefined);
  });

  ipcMain.handle('backup:list', async () => {
    return listLocalBackups();
  });

  ipcMain.handle('backup:lastDate', async () => {
    return getLastBackupDate();
  });

  ipcMain.handle('backup:dbSize', async () => {
    return getDbFileSize();
  });

  // Expenses
  ipcMain.handle('expenses:create', async (_event, data: any) => {
    // Force-stamp branch from session; ignore client-supplied branch_id
    return createExpense({ ...data, branch_id: requireBranch(), created_by: currentSession?.userId ?? null });
  });

  ipcMain.handle('expenses:getAll', async (_event, filters?: any) => {
    return getExpenses({ ...filters, branchId: requireBranch() });
  });

  ipcMain.handle('expenses:delete', async (_event, id: number) => {
    assertExpenseInBranch(id, requireBranch());
    return deleteExpense(id);
  });

  ipcMain.handle('expenses:getProfitReport', async (_event, startDate: string, endDate: string, _branchId?: number) => {
    return getProfitReport(startDate, endDate, requireBranch());
  });

  // Sync - Supabase
  ipcMain.handle('sync:perform', async () => {
    return performSync();
  });

  ipcMain.handle('sync:getStatus', async () => {
    return getSupabaseSyncStatus();
  });

  ipcMain.handle('sync:backfill', async () => {
    return backfillExistingData();
  });

  ipcMain.handle('sync:enable', async () => {
    enableSync();
    startSupabaseSyncLoop();
    return getSupabaseSyncStatus();
  });

  ipcMain.handle('sync:disable', async () => {
    disableSync();
    stopSupabaseSyncLoop();
    return getSupabaseSyncStatus();
  });

  ipcMain.handle('sync:setInterval', async (_event, minutes: number) => {
    setSyncInterval(minutes);
    restartSupabaseSyncLoop();
    return { success: true };
  });

  ipcMain.handle('sync:selectAndUploadDatabase', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Select Database File',
      filters: [{ name: 'SQLite Database', extensions: ['db', 'sqlite', 'sqlite3'] }],
      properties: ['openFile'],
    });
    if (canceled || filePaths.length === 0) return { success: false, errors: ['Cancelled'] };
    return uploadExternalDatabase(filePaths[0]);
  });

  // Undo/Redo
  ipcMain.handle('undo:perform', async () => {
    const userId = currentSession?.userId ?? 0;
    const result = performUndo(userId);
    mainWindow?.webContents.send('undo:stateChanged', getUndoRedoState(userId));
    return result;
  });

  ipcMain.handle('redo:perform', async () => {
    const userId = currentSession?.userId ?? 0;
    const result = performRedo(userId);
    mainWindow?.webContents.send('undo:stateChanged', getUndoRedoState(userId));
    return result;
  });

  ipcMain.handle('undo:getState', async () => {
    return getUndoRedoState(currentSession?.userId ?? 0);
  });

  ipcMain.handle('updater:check', async () => {
    try {
      await autoUpdater.checkForUpdates();
      return { checking: true };
    } catch (err: any) {
      return { error: err.message };
    }
  });

  ipcMain.handle('updater:quitAndInstall', () => {
    autoUpdater.quitAndInstall();
  });

  ipcMain.handle('updater:getVersion', () => {
    return app.getVersion();
  });

  ipcMain.handle('window:minimize', () => mainWindow?.minimize());

  // Piece types
  ipcMain.handle('pieceTypes:getAll', async () => {
    return getPieceTypes();
  });

  ipcMain.handle('pieceTypes:updateBasePrice', async (_event, name_en: string, base_price: number) => {
    return updateBasePrice(name_en, base_price);
  });

  ipcMain.handle('pieceTypes:getBasePrice', async (_event, name_en: string) => {
    return getBasePrice(name_en);
  });

  ipcMain.handle('pieceTypes:create', async (_event, data: any) => {
    return createPieceType(data);
  });

  ipcMain.handle('pieceTypes:update', async (_event, id: number, data: any) => {
    return updatePieceType(id, data);
  });

  ipcMain.handle('pieceTypes:delete', async (_event, id: number) => {
    return deletePieceType(id);
  });

  ipcMain.handle('pieceTypes:restoreDefaults', async () => {
    return restoreDefaultPieceTypes();
  });

  // Notifications
  ipcMain.handle('notifications:getForUser', async (_event, userId: number, role: string, limit?: number) => {
    return getNotificationsForUser(userId, role, requireBranch(), limit || 20);
  });

  ipcMain.handle('notifications:getUnreadCount', async (_event, userId: number, role: string) => {
    return getUnreadCount(userId, role, requireBranch());
  });

  ipcMain.handle('notifications:markAsRead', async (_event, notificationId: number) => {
    return markAsRead(notificationId, requireBranch());
  });

  ipcMain.handle('notifications:markAllAsRead', async (_event, userId: number, role: string) => {
    return markAllAsRead(userId, role, requireBranch());
  });

  ipcMain.handle('notifications:softDelete', async (_event, notificationId: number) => {
    return softDeleteNotification(notificationId, requireBranch());
  });

  ipcMain.handle('notifications:clearRead', async (_event, userId: number, role: string) => {
    return clearReadNotifications(userId, role, requireBranch());
  });

  ipcMain.handle('notifications:generateOverdue', async () => {
    // Scope to the caller's branch
    return generateOverdueNotifications(requireBranch());
  });

  ipcMain.handle('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });
  ipcMain.handle('window:close', () => mainWindow?.close());
  ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized() ?? false);
  ipcMain.handle('print:receipt', async () => {
    if (mainWindow) {
      await mainWindow.webContents.print({ silent: false, printBackground: true });
    }
  });
  ipcMain.handle('shell:openExternal', async (_event, url: string) => {
    await shell.openExternal(url);
  });
}

app.on('ready', async () => {
  // Check database health before proceeding
  if (!isDbReady()) {
    const errMsg = getInitError();
    const choice = dialog.showMessageBoxSync({
      type: 'error',
      title: 'Database Error',
      message: 'The database file could not be opened.',
      detail: `${errMsg}\n\nYou can restore from a recent backup or close the application.\n\nDatabase location: ${getDbPath()}`,
      buttons: ['Restore from Backup...', 'Close App'],
      defaultId: 0,
      cancelId: 1,
    });
    if (choice === 0) {
      const result = await restoreBackup();
      if (!result.success) {
        dialog.showErrorBox('Restore Failed', result.error || 'Unknown error');
        app.quit();
      }
      return; // restoreBackup calls app.relaunch() + app.exit(0)
    }
    app.quit();
    return;
  }

  const integrity = checkIntegrity();
  if (!integrity.ok) {
    const choice = dialog.showMessageBoxSync({
      type: 'error',
      title: 'Database Corruption Detected',
      message: 'The database file is corrupted.',
      detail: `${integrity.error}\n\nYou can restore from a recent backup to recover your data.\n\nDatabase location: ${getDbPath()}`,
      buttons: ['Restore from Backup...', 'Close App'],
      defaultId: 0,
      cancelId: 1,
    });
    if (choice === 0) {
      const result = await restoreBackup();
      if (!result.success) {
        dialog.showErrorBox('Restore Failed', result.error || 'Unknown error');
        app.quit();
      }
      return;
    }
    app.quit();
    return;
  }

  initializeSchema();
  syncAllOrderPayments(); // ensure orders.paid matches actual payment records
  registerIpcHandlers();
  createWindow();

  autoUpdater.setFeedURL({
    url: 'https://github.com/Abu-ellil/etiquette-tailor/releases/latest/download/',
  });

  autoUpdater.on('update-available', (info) => {
    mainWindow?.webContents.send('update:available', {
      version: info.version,
      releaseNotes: info.releaseNotes,
    });
  });

  autoUpdater.on('update-not-available', () => {
    mainWindow?.webContents.send('update:not-available');
  });

  autoUpdater.on('update-downloaded', () => {
    mainWindow?.webContents.send('update:downloaded');
  });

  autoUpdater.on('error', (err) => {
    mainWindow?.webContents.send('update:error', err?.message || 'Unknown error');
  });

  autoUpdater.on('download-progress', (progress) => {
    mainWindow?.webContents.send('update:progress', {
      percent: progress.percent,
      transferred: progress.transferred,
      total: progress.total,
    });
  });

  if (app.isPackaged) {
    autoUpdater.checkForUpdates();
    setInterval(() => autoUpdater.checkForUpdates(), 30 * 60 * 1000);
  }

  // Start auto-sync if enabled
  if (getSetting('supabase_sync_enabled') === '1') {
    startSupabaseSyncLoop();
  }

  // Start connectivity check and realtime subscription
  startConnectivityCheck();
  if (getSetting('supabase_sync_enabled') === '1') {
    subscribeToRemoteChanges((table, op) => {
      mainWindow?.webContents.send('sync:remoteChange', { table, op });
    });
  }

  onConnectivityChange((online) => {
    setOnlineState(online);
    if (online) {
      safeLog('[connectivity] back online -- flushing queue + resubscribing');
      performSync();
      if (getSetting('supabase_sync_enabled') === '1') {
        subscribeToRemoteChanges((table, op) => {
          mainWindow?.webContents.send('sync:remoteChange', { table, op });
        });
      }
    } else {
      safeLog('[connectivity] offline -- pausing realtime');
      unsubscribeFromRemoteChanges();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Cleanup before quit to prevent EPIPE errors
app.on('before-quit', () => {
  isShuttingDown = true;
  stopSupabaseSyncLoop();
  unsubscribeFromRemoteChanges();
  stopConnectivityCheck();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
