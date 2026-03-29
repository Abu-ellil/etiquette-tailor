import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
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
  getAllOrders,
  getOrder,
  searchOrders,
  createOrder,
  updateOrder,
  updateOrderStatus,
  getOrderMeasurements,
  updateOrderMeasurements,
  getOrderTasks,
  createOrderTask,
  updateTaskStatus,
  reassignTask,
  getOrderStats,
} from '../db';

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

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    frame: true,
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
  ipcMain.handle('auth:login', async (_event, username: string, password: string) => {
    const session = authenticateUser(username, password);
    if (session) {
      currentSession = session;
    }
    return session;
  });

  ipcMain.handle('auth:getSession', async () => {
    return currentSession;
  });

  ipcMain.handle('auth:logout', async () => {
    currentSession = null;
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
    return createOrder(data, measurements);
  });

  ipcMain.handle('orders:update', async (_event, id: number, data: any) => {
    return updateOrder(id, data);
  });

  ipcMain.handle('orders:updateStatus', async (_event, id: number, status: string) => {
    return updateOrderStatus(id, status);
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
    return updateTaskStatus(taskId, status);
  });

  ipcMain.handle('orders:reassignTask', async (_event, taskId: number, newUserId: number, wageType: string, wageRate: number, wageAmount: number) => {
    return reassignTask(taskId, newUserId, wageType, wageRate, wageAmount);
  });

  ipcMain.handle('orders:getStats', async (_event, branchId?: number) => {
    return getOrderStats(branchId);
  });
}

app.on('ready', () => {
  initializeSchema();
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
