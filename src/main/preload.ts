import { contextBridge, ipcRenderer } from 'electron';

export interface ElectronAPI {
  auth: {
    login: (credentials: { username: string; password: string }) => Promise<any>;
    getSession: () => Promise<any>;
    logout: () => Promise<void>;
  };

  branches: {
    getAll: () => Promise<any[]>;
    getById: (id: number) => Promise<any>;
    update: (id: number, data: any) => Promise<void>;
    create: (data: any) => Promise<{ id: number }>;
  };

  settings: {
    getAll: () => Promise<Record<string, string>>;
    set: (settings: Record<string, string>) => Promise<void>;
  };

  users: {
    getAll: () => Promise<any[]>;
    create: (data: any) => Promise<any>;
    update: (id: number, data: any) => Promise<any>;
    deactivate: (id: number) => Promise<void>;
  };

  workers: {
    getAll: () => Promise<any[]>;
    getRates: (workerId: number) => Promise<any[]>;
    setRate: (data: any) => Promise<any>;
    getActiveRate: (workerId: number, pieceType: string) => Promise<any>;
    getWorkerTasks: (userId: number) => Promise<any[]>;
    getMonthlyEarnings: (userId: number, month: string) => Promise<any>;
    getWorkerOrderDetails: (userId: number, startDate: string, endDate: string) => Promise<any[]>;
    getAccount: (userId: number) => Promise<any>;
    addPayment: (userId: number, amount: number, note: string | null) => Promise<number>;
    getPayments: (userId: number) => Promise<any[]>;
    getWorkerEarnings: (userId: number, startDate: string, endDate: string) => Promise<any>;
    batchPayments: (payments: Array<{userId: number; amount: number; note: string | null}>) => Promise<number>;
    getProductivity: (branchId?: number, startDate?: string, endDate?: string) => Promise<any[]>;
    getOverdueTasks: (branchId?: number) => Promise<any[]>;
    getWorkloads: (branchId?: number) => Promise<any[]>;
    getRecommended: (pieceType: string, taskType: string) => Promise<any[]>;
  };

  customers: {
    getAll: () => Promise<any[]>;
    search: (query: string) => Promise<any[]>;
    create: (data: any) => Promise<any>;
    update: (id: number, data: any) => Promise<any>;
    delete: (id: number) => Promise<void>;
  };

  orders: {
    getAll: (branchId?: number, status?: string) => Promise<any[]>;
    get: (id: number) => Promise<any>;
    search: (query: string) => Promise<any[]>;
    create: (data: any) => Promise<any>;
    createWithTasks: (payload: any) => Promise<{ orderId: number; orderNumber: string }>;
    update: (id: number, data: any) => Promise<any>;
    updateStatus: (id: number, status: string) => Promise<any>;
    getMeasurements: (orderId: number) => Promise<any>;
    updateMeasurements: (orderId: number, data: any) => Promise<any>;
    getTasks: (orderId: number) => Promise<any[]>;
    createTask: (data: any) => Promise<any>;
    updateTaskStatus: (taskId: number, status: string) => Promise<any>;
    reassignTask: (taskId: number, workerId: number, wageType: string, wageRate: number, wageAmount: number) => Promise<any>;
    getStats: (branchId?: number) => Promise<any>;
    getAllTasks: (filters?: { branchId?: number; workerId?: number; taskType?: string }) => Promise<any[]>;
    recalculateTaskWages: (orderId: number, newPrice: number) => Promise<number>;
    addPayment: (orderId: number, amount: number, method: 'cash' | 'card', note: string | null) => Promise<number>;
    getPayments: (orderId: number) => Promise<any[]>;
    deletePayment: (paymentId: number) => Promise<void>;
    getItems: (orderId: number) => Promise<any[]>;
    createItem: (data: any) => Promise<any>;
    updateItem: (id: number, data: any) => Promise<any>;
    deleteItem: (id: number) => Promise<void>;
    recalculateTotal: (orderId: number) => Promise<void>;
  };

  window: {
    minimize: () => Promise<void>;
    maximize: () => Promise<void>;
    close: () => Promise<void>;
    isMaximized: () => Promise<boolean>;
  };

  pieceTypes: {
    getAll: () => Promise<any[]>;
    updateBasePrice: (name_en: string, base_price: number) => Promise<void>;
    getBasePrice: (name_en: string) => Promise<number>;
  };

  reports: {
    getStats: (branchId?: number, period?: string) => Promise<any>;
    getPaymentSplit: (branchId?: number, period?: string) => Promise<any>;
    getMonthlyRevenue: (months?: number, branchId?: number) => Promise<any[]>;
    getRecentOrders: (limit?: number, branchId?: number, period?: string) => Promise<any[]>;
    getAdvanced: (filter: any) => Promise<any>;
    getDailyStats: (days: number, branchId?: number) => Promise<any[]>;
    getWorkerContribution: (branchId?: number, startDate?: string, endDate?: string) => Promise<any[]>;
    exportPDF: (htmlContent: string, filename: string) => Promise<string>;
    sendEmail: (to: string, subject: string, body: string) => Promise<boolean>;
  };

  backup: {
    create: () => Promise<{ success: boolean; path?: string; error?: string }>;
    restore: () => Promise<{ success: boolean; error?: string }>;
    list: () => Promise<any[]>;
    lastDate: () => Promise<string | null>;
    dbSize: () => Promise<{ usedBytes: number; label: string }>;
  };

  notifications: {
    getForUser: (userId: number, role: string, limit?: number) => Promise<any[]>;
    getUnreadCount: (userId: number, role: string) => Promise<number>;
    markAsRead: (notificationId: number) => Promise<void>;
    markAllAsRead: (userId: number, role: string) => Promise<void>;
    softDelete: (notificationId: number) => Promise<void>;
    generateOverdue: () => Promise<number>;
  };

  activation: {
    check: () => Promise<{ activated: boolean; expired: boolean; daysLeft: number }>;
    activate: (code: string) => Promise<boolean>;
  };

  expenses: {
    create: (data: any) => Promise<number>;
    getAll: (filters?: { startDate?: string; endDate?: string; category?: string; branchId?: number }) => Promise<any[]>;
    delete: (id: number) => Promise<void>;
    getProfitReport: (startDate: string, endDate: string, branchId?: number) => Promise<any>;
  };
}

const api: ElectronAPI = {
  auth: {
    login: (credentials) => ipcRenderer.invoke('auth:login', credentials.username, credentials.password),
    getSession: () => ipcRenderer.invoke('auth:getSession'),
    logout: () => ipcRenderer.invoke('auth:logout'),
  },

  branches: {
    getAll: () => ipcRenderer.invoke('branches:getAll'),
    getById: (id) => ipcRenderer.invoke('branches:getById', id),
    update: (id, data) => ipcRenderer.invoke('branches:update', id, data),
    create: (data) => ipcRenderer.invoke('branches:create', data),
  },

  settings: {
    getAll: () => ipcRenderer.invoke('settings:getAll'),
    set: (settings) => ipcRenderer.invoke('settings:set', settings),
  },

  users: {
    getAll: () => ipcRenderer.invoke('users:getAll'),
    create: (data) => ipcRenderer.invoke('users:create', data),
    update: (id, data) => ipcRenderer.invoke('users:update', id, data),
    deactivate: (id) => ipcRenderer.invoke('users:deactivate', id),
  },

  workers: {
    getAll: () => ipcRenderer.invoke('workers:getAll'),
    getRates: (workerId) => ipcRenderer.invoke('workers:getRates', workerId),
    setRate: (data) => ipcRenderer.invoke('workers:setRate', data),
    getActiveRate: (workerId, pieceType) => ipcRenderer.invoke('workers:getActiveRate', workerId, pieceType),
    getWorkerTasks: (userId) => ipcRenderer.invoke('workers:getWorkerTasks', userId),
    getMonthlyEarnings: (userId, month) => ipcRenderer.invoke('workers:getMonthlyEarnings', userId, month),
    getWorkerOrderDetails: (userId, startDate, endDate) => ipcRenderer.invoke('workers:getWorkerOrderDetails', userId, startDate, endDate),
    getAccount: (userId) => ipcRenderer.invoke('workers:getAccount', userId),
    addPayment: (userId, amount, note) => ipcRenderer.invoke('workers:addPayment', userId, amount, note),
    getPayments: (userId) => ipcRenderer.invoke('workers:getPayments', userId),
    getWorkerEarnings: (userId, startDate, endDate) => ipcRenderer.invoke('workers:getWorkerEarnings', userId, startDate, endDate),
    batchPayments: (payments) => ipcRenderer.invoke('workers:batchPayments', payments),
    getProductivity: (branchId?, startDate?, endDate?) => ipcRenderer.invoke('workers:getProductivity', branchId, startDate, endDate),
    getOverdueTasks: (branchId?) => ipcRenderer.invoke('workers:getOverdueTasks', branchId),
    getWorkloads: (branchId?) => ipcRenderer.invoke('workers:getWorkloads', branchId),
    getRecommended: (pieceType, taskType) => ipcRenderer.invoke('workers:getRecommended', pieceType, taskType),
  },

  customers: {
    getAll: () => ipcRenderer.invoke('customers:getAll'),
    search: (query) => ipcRenderer.invoke('customers:search', query),
    create: (data) => ipcRenderer.invoke('customers:create', data),
    update: (id, data) => ipcRenderer.invoke('customers:update', id, data),
    delete: (id) => ipcRenderer.invoke('customers:delete', id),
  },

  orders: {
    getAll: (branchId?: number, status?: string) => ipcRenderer.invoke('orders:getAll', branchId, status),
    get: (id) => ipcRenderer.invoke('orders:get', id),
    search: (query) => ipcRenderer.invoke('orders:search', query),
    create: (data) => ipcRenderer.invoke('orders:create', data),
    createWithTasks: (payload: any) => ipcRenderer.invoke('orders:createWithTasks', payload),
    update: (id, data) => ipcRenderer.invoke('orders:update', id, data),
    updateStatus: (id, status) => ipcRenderer.invoke('orders:updateStatus', id, status),
    getMeasurements: (orderId) => ipcRenderer.invoke('orders:getMeasurements', orderId),
    updateMeasurements: (orderId, data) => ipcRenderer.invoke('orders:updateMeasurements', orderId, data),
    getTasks: (orderId) => ipcRenderer.invoke('orders:getTasks', orderId),
    createTask: (data) => ipcRenderer.invoke('orders:createTask', data),
    updateTaskStatus: (taskId, status) => ipcRenderer.invoke('orders:updateTaskStatus', taskId, status),
    reassignTask: (taskId, workerId, wageType, wageRate, wageAmount) => ipcRenderer.invoke('orders:reassignTask', taskId, workerId, wageType, wageRate, wageAmount),
    getStats: (branchId?: number) => ipcRenderer.invoke('orders:getStats', branchId),
    getAllTasks: (filters) => ipcRenderer.invoke('orders:getAllTasks', filters),
    recalculateTaskWages: (orderId, newPrice) => ipcRenderer.invoke('orders:recalculateTaskWages', orderId, newPrice),
    addPayment: (orderId, amount, method, note) => ipcRenderer.invoke('orders:addPayment', orderId, amount, method, note),
    getPayments: (orderId) => ipcRenderer.invoke('orders:getPayments', orderId),
    deletePayment: (paymentId) => ipcRenderer.invoke('orders:deletePayment', paymentId),
    getItems: (orderId: number) => ipcRenderer.invoke('orders:getItems', orderId),
    createItem: (data: any) => ipcRenderer.invoke('orders:createItem', data),
    updateItem: (id: number, data: any) => ipcRenderer.invoke('orders:updateItem', id, data),
    deleteItem: (id: number) => ipcRenderer.invoke('orders:deleteItem', id),
    recalculateTotal: (orderId: number) => ipcRenderer.invoke('orders:recalculateTotal', orderId),
  },

  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  },

  pieceTypes: {
    getAll: () => ipcRenderer.invoke('pieceTypes:getAll'),
    updateBasePrice: (name_en: string, base_price: number) => ipcRenderer.invoke('pieceTypes:updateBasePrice', name_en, base_price),
    getBasePrice: (name_en: string) => ipcRenderer.invoke('pieceTypes:getBasePrice', name_en),
  },

  reports: {
    getStats: (branchId?: number, period?: string) => ipcRenderer.invoke('reports:getStats', branchId, period),
    getPaymentSplit: (branchId?: number, period?: string) => ipcRenderer.invoke('reports:getPaymentSplit', branchId, period),
    getMonthlyRevenue: (months?: number, branchId?: number) => ipcRenderer.invoke('reports:getMonthlyRevenue', months, branchId),
    getRecentOrders: (limit?: number, branchId?: number, period?: string) => ipcRenderer.invoke('reports:getRecentOrders', limit, branchId, period),
    getAdvanced: (filter: any) => ipcRenderer.invoke('reports:getAdvanced', filter),
    getDailyStats: (days: number, branchId?: number) => ipcRenderer.invoke('reports:getDailyStats', days, branchId),
    getWorkerContribution: (branchId?: number, startDate?: string, endDate?: string) => ipcRenderer.invoke('reports:getWorkerContribution', branchId, startDate, endDate),
    exportPDF: (htmlContent: string, filename: string) => ipcRenderer.invoke('reports:exportPDF', htmlContent, filename),
    sendEmail: (to: string, subject: string, body: string) => ipcRenderer.invoke('reports:sendEmail', to, subject, body),
  },

  backup: {
    create: () => ipcRenderer.invoke('backup:create'),
    restore: () => ipcRenderer.invoke('backup:restore'),
    list: () => ipcRenderer.invoke('backup:list'),
    lastDate: () => ipcRenderer.invoke('backup:lastDate'),
    dbSize: () => ipcRenderer.invoke('backup:dbSize'),
  },

  notifications: {
    getForUser: (userId, role, limit?) => ipcRenderer.invoke('notifications:getForUser', userId, role, limit),
    getUnreadCount: (userId, role) => ipcRenderer.invoke('notifications:getUnreadCount', userId, role),
    markAsRead: (notificationId) => ipcRenderer.invoke('notifications:markAsRead', notificationId),
    markAllAsRead: (userId, role) => ipcRenderer.invoke('notifications:markAllAsRead', userId, role),
    softDelete: (notificationId) => ipcRenderer.invoke('notifications:softDelete', notificationId),
    generateOverdue: () => ipcRenderer.invoke('notifications:generateOverdue'),
  },

  activation: {
    check: () => ipcRenderer.invoke('activation:check'),
    activate: (code: string) => ipcRenderer.invoke('activation:activate', code),
  },

  expenses: {
    create: (data) => ipcRenderer.invoke('expenses:create', data),
    getAll: (filters?) => ipcRenderer.invoke('expenses:getAll', filters),
    delete: (id) => ipcRenderer.invoke('expenses:delete', id),
    getProfitReport: (startDate, endDate, branchId?) => ipcRenderer.invoke('expenses:getProfitReport', startDate, endDate, branchId),
  },
};

contextBridge.exposeInMainWorld('electronAPI', api);
