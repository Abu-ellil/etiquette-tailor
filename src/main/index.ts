import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import started from 'electron-squirrel-startup';
import nodemailer from 'nodemailer';
import { initializeSchema } from '../db/schema';
import {
  authenticateUser,
  getAllUsers,
  createUser,
  updateUser,
  deactivateUser,
  getAllBranches,
  getBranchById,
  getAllWorkers,
  getWorkerRates,
  setWorkerRate,
  getActiveRate,
  getAllCustomers,
  searchCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerOrders,
  getCustomerOutstandingOrders,
  getAllOrders,
  getOrder,
  searchOrders,
  createOrder,
  createOrderWithTasks,
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
  getWorkerTasks,
  getMonthlyEarnings,
  getWorkerOrderDetails,
  getWorkerAccount,
  addWorkerPayment,
  getWorkerPayments,
  getWorkerEarnings,
  batchWorkerPayments,
  getAllWorkerProductivity,
  getOverdueTasks,
  getWorkerWorkloads,
  getRecommendedWorkers,
  getAllSettings,
  setSettings,
  updateBranch,
  createBranch,
  getPieceTypes,
  updateBasePrice,
  getBasePrice,
  recalculateTaskWages,
  getReportStats,
  getPaymentSplit,
  getMonthlyRevenue,
  getRecentOrders,
  addOrderPayment,
  getOrderPayments,
  deleteOrderPayment,
  getOrderItems,
  createOrderItem,
  updateOrderItem,
  deleteOrderItem,
  recalculateOrderTotal,
  getAdvancedReport,
  getDailyStats,
  getWorkerContribution,
  saveReportEmail,
  getReportEmails,
  deleteReportEmail,
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
import db from '../db/schema';

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

  ipcMain.handle('branches:getAll', async () => {
    return getAllBranches();
  });

  ipcMain.handle('branches:getById', async (_event, id: number) => {
    return getBranchById(id);
  });

  ipcMain.handle('users:getAll', async (_event, branchId?: number) => {
    return getAllUsers(branchId);
  });

  ipcMain.handle('users:create', async (_event, data: any) => {
    return createUser(data);
  });

  ipcMain.handle('users:update', async (_event, id: number, data: any) => {
    return updateUser(id, data);
  });

  ipcMain.handle('users:deactivate', async (_event, id: number) => {
    return deactivateUser(id);
  });

  ipcMain.handle('workers:getAll', async (_event, branchId?: number) => {
    return getAllWorkers(branchId);
  });

  ipcMain.handle('workers:getRates', async (_event, userId: number) => {
    return getWorkerRates(userId);
  });

  ipcMain.handle('workers:setRate', async (_event, rate: any) => {
    return setWorkerRate(rate);
  });

  ipcMain.handle('workers:getActiveRate', async (_event, userId: number, pieceType: string) => {
    return getActiveRate(userId, pieceType);
  });

  ipcMain.handle('workers:getWorkerTasks', async (_event, userId: number) => {
    return getWorkerTasks(userId);
  });

  ipcMain.handle('workers:getMonthlyEarnings', async (_event, userId: number, month: string) => {
    return getMonthlyEarnings(userId, month);
  });

  ipcMain.handle('workers:getWorkerOrderDetails', async (_event, userId: number, startDate: string, endDate: string) => {
    return getWorkerOrderDetails(userId, startDate, endDate);
  });

  ipcMain.handle('workers:getAccount', async (_event, userId: number) => {
    return getWorkerAccount(userId);
  });

  ipcMain.handle('workers:addPayment', async (_event, userId: number, amount: number, note: string | null) => {
    return addWorkerPayment(userId, amount, note, currentSession?.userId ?? null);
  });

  ipcMain.handle('workers:getPayments', async (_event, userId: number) => {
    return getWorkerPayments(userId);
  });

  ipcMain.handle('workers:getWorkerEarnings', async (_event, userId: number, startDate: string, endDate: string) => {
    return getWorkerEarnings(userId, startDate, endDate);
  });

  ipcMain.handle('workers:batchPayments', async (_event, payments: Array<{userId: number; amount: number; note: string | null}>) => {
    return batchWorkerPayments(payments, currentSession?.userId ?? null);
  });

  ipcMain.handle('workers:getProductivity', async (_event, branchId?: number, startDate?: string, endDate?: string) => {
    return getAllWorkerProductivity(branchId, startDate, endDate);
  });

  ipcMain.handle('workers:getOverdueTasks', async (_event, branchId?: number) => {
    return getOverdueTasks(branchId);
  });

  ipcMain.handle('workers:getWorkloads', async (_event, branchId?: number) => {
    return getWorkerWorkloads(branchId);
  });

  ipcMain.handle('workers:getRecommended', async (_event, pieceType: string, taskType: string) => {
    return getRecommendedWorkers(pieceType, taskType);
  });

  ipcMain.handle('customers:getAll', async (_event, branchId?: number) => {
    return getAllCustomers(branchId);
  });

  ipcMain.handle('customers:search', async (_event, query: string, branchId?: number) => {
    return searchCustomers(query, branchId);
  });

  ipcMain.handle('customers:create', async (_event, data: any) => {
    return createCustomer(data);
  });

  ipcMain.handle('customers:update', async (_event, id: number, data: any) => {
    return updateCustomer(id, data);
  });

  ipcMain.handle('customers:delete', async (_event, id: number) => {
    return deleteCustomer(id);
  });

  ipcMain.handle('customers:getOutstandingOrders', async (_event, customerId: number) => {
    return getCustomerOutstandingOrders(customerId);
  });

  ipcMain.handle('customers:getOrders', async (_event, customerId: number) => {
    return getCustomerOrders(customerId);
  });

  ipcMain.handle('orders:getAll', async (_event, branchId?: number, status?: string) => {
    return getAllOrders(branchId, status);
  });

  ipcMain.handle('orders:get', async (_event, id: number) => {
    return getOrder(id);
  });

  ipcMain.handle('orders:search', async (_event, query: string, branchId?: number) => {
    return searchOrders(query, branchId);
  });

  ipcMain.handle('orders:create', async (_event, data: any, measurements?: any) => {
    const result = createOrder(data, measurements);
    try {
      const orderId = typeof result === 'object' ? result.id : result;
      const order = getOrder(orderId);
      if (order) {
        const msg = `Order ${order.order_number} created for ${data.customer_name || 'customer'}`;
        createNotification({ type: 'order_created', title: 'New Order', message: msg, order_id: orderId, target_role: 'admin' });
        createNotification({ type: 'order_created', title: 'New Order', message: msg, order_id: orderId, target_role: 'manager' });
      }
    } catch (e) { console.error('Notification error:', e); }
    return result;
  });

  ipcMain.handle('orders:createWithTasks', (_e, payload) => {
    return createOrderWithTasks(payload);
  });

  ipcMain.handle('orders:update', async (_event, id: number, data: any) => {
    return updateOrder(id, data);
  });

  ipcMain.handle('orders:updateStatus', async (_event, id: number, status: string) => {
    const result = updateOrderStatus(id, status);
    try {
      const order = getOrder(id);
      if (order) {
        const msg = `Order ${order.order_number} is now "${status}"`;
        createNotification({ type: 'order_status_changed', title: 'Order Status Updated', message: msg, order_id: id, target_role: 'admin' });
        createNotification({ type: 'order_status_changed', title: 'Order Status Updated', message: msg, order_id: id, target_role: 'manager' });
        const tasks = getOrderTasks(id);
        for (const task of tasks) {
          if (task.assigned_to) {
            createNotification({ type: 'order_status_changed', title: 'Order Status Changed', message: msg, order_id: id, task_id: task.id, target_user_id: task.assigned_to });
          }
        }
      }
    } catch (e) { console.error('Notification error:', e); }
    return result;
  });

  ipcMain.handle('orders:getMeasurements', async (_event, orderId: number) => {
    return getOrderMeasurements(orderId);
  });

  ipcMain.handle('orders:updateMeasurements', async (_event, orderId: number, measurements: any) => {
    return updateOrderMeasurements(orderId, measurements);
  });

  ipcMain.handle('orders:getTasks', async (_event, orderId: number) => {
    return getOrderTasks(orderId);
  });

  ipcMain.handle('orders:createTask', async (_event, data: any) => {
    return createOrderTask(data);
  });

  ipcMain.handle('orders:updateTaskStatus', async (_event, taskId: number, status: string) => {
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
          createNotification({ type: 'task_status_changed', title: 'Task Updated', message: msg, order_id: tasks.order_id, task_id: taskId, target_role: 'admin' });
          createNotification({ type: 'task_status_changed', title: 'Task Updated', message: msg, order_id: tasks.order_id, task_id: taskId, target_role: 'manager' });
        }
      }
    } catch (e) { console.error('Notification error:', e); }
    return result;
  });

  ipcMain.handle('orders:reassignTask', async (_event, taskId: number, newUserId: number, wageType: string, wageRate: number, wageAmount: number) => {
    return reassignTask(taskId, newUserId, wageType, wageRate, wageAmount);
  });

  ipcMain.handle('orders:getStats', async (_event, branchId?: number) => {
    return getOrderStats(branchId);
  });

  ipcMain.handle('reports:getStats', async (_event, branchId?: number, period?: string) => {
    return getReportStats(branchId, period);
  });

  ipcMain.handle('reports:getPaymentSplit', async (_event, branchId?: number, period?: string) => {
    return getPaymentSplit(branchId, period);
  });

  ipcMain.handle('reports:getMonthlyRevenue', async (_event, months?: number, branchId?: number) => {
    return getMonthlyRevenue(months, branchId);
  });

  ipcMain.handle('reports:getRecentOrders', async (_event, limit?: number, branchId?: number, period?: string) => {
    return getRecentOrders(limit, branchId, period);
  });

  ipcMain.handle('reports:getAdvanced', async (_event, filter: any) => {
    return getAdvancedReport(filter);
  });

  ipcMain.handle('reports:getDailyStats', async (_event, days: number, branchId?: number) => {
    return getDailyStats(days, branchId);
  });

  ipcMain.handle('reports:getWorkerContribution', async (_event, branchId?: number, startDate?: string, endDate?: string) => {
    return getWorkerContribution(branchId, startDate, endDate);
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
    return getAllTasks(filters);
  });

  ipcMain.handle('orders:recalculateTaskWages', async (_event, orderId: number, newPrice: number) => {
    return recalculateTaskWages(orderId, newPrice);
  });

  ipcMain.handle('orders:addPayment', async (_event, orderId: number, amount: number, method: 'cash' | 'card', note: string | null) => {
    const result = addOrderPayment(orderId, amount, method, note, currentSession?.userId ?? null);
    try {
      const order = getOrder(orderId);
      if (order) {
        const msg = `${amount} ${getAllSettings().currency || 'QAR'} ${method} payment on order ${order.order_number}`;
        createNotification({ type: 'payment_received', title: 'Payment Received', message: msg, order_id: orderId, target_role: 'admin' });
        createNotification({ type: 'payment_received', title: 'Payment Received', message: msg, order_id: orderId, target_role: 'manager' });
      }
    } catch (e) { console.error('Notification error:', e); }
    return result;
  });

  ipcMain.handle('orders:getPayments', async (_event, orderId: number) => {
    return getOrderPayments(orderId);
  });

  ipcMain.handle('orders:deletePayment', async (_event, paymentId: number) => {
    return deleteOrderPayment(paymentId);
  });

  // Order Items
  ipcMain.handle('orders:getItems', async (_event, orderId: number) => {
    return getOrderItems(orderId);
  });

  ipcMain.handle('orders:createItem', async (_event, data: any) => {
    return createOrderItem(data);
  });

  ipcMain.handle('orders:updateItem', async (_event, id: number, data: any) => {
    return updateOrderItem(id, data);
  });

  ipcMain.handle('orders:deleteItem', async (_event, id: number) => {
    return deleteOrderItem(id);
  });

  ipcMain.handle('orders:recalculateTotal', async (_event, orderId: number) => {
    return recalculateOrderTotal(orderId);
  });

  // Settings
  ipcMain.handle('settings:getAll', async () => {
    return getAllSettings();
  });

  ipcMain.handle('settings:set', async (_event, settings: Record<string, string>) => {
    return setSettings(settings);
  });

  // Branch management
  ipcMain.handle('branches:update', async (_event, id: number, data: any) => {
    return updateBranch(id, data);
  });

  ipcMain.handle('branches:create', async (_event, data: any) => {
    return createBranch(data);
  });

  // Backup & Restore
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
    return createExpense({ ...data, created_by: currentSession?.userId ?? null });
  });

  ipcMain.handle('expenses:getAll', async (_event, filters?: any) => {
    return getExpenses(filters);
  });

  ipcMain.handle('expenses:delete', async (_event, id: number) => {
    return deleteExpense(id);
  });

  ipcMain.handle('expenses:getProfitReport', async (_event, startDate: string, endDate: string, branchId?: number) => {
    return getProfitReport(startDate, endDate, branchId);
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

  // Notifications
  ipcMain.handle('notifications:getForUser', async (_event, userId: number, role: string, limit?: number) => {
    return getNotificationsForUser(userId, role, limit || 20);
  });

  ipcMain.handle('notifications:getUnreadCount', async (_event, userId: number, role: string) => {
    return getUnreadCount(userId, role);
  });

  ipcMain.handle('notifications:markAsRead', async (_event, notificationId: number) => {
    return markAsRead(notificationId);
  });

  ipcMain.handle('notifications:markAllAsRead', async (_event, userId: number, role: string) => {
    return markAllAsRead(userId, role);
  });

  ipcMain.handle('notifications:softDelete', async (_event, notificationId: number) => {
    return softDeleteNotification(notificationId);
  });

  ipcMain.handle('notifications:clearRead', async (_event, userId: number, role: string) => {
    return clearReadNotifications(userId, role);
  });

  ipcMain.handle('notifications:generateOverdue', async () => {
    return generateOverdueNotifications();
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

app.on('ready', () => {
  initializeSchema();
  syncAllOrderPayments(); // ensure orders.paid matches actual payment records
  registerIpcHandlers();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
