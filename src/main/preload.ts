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
  };

  customers: {
    getAll: () => Promise<any[]>;
    search: (query: string) => Promise<any[]>;
    create: (data: any) => Promise<any>;
    update: (id: number, data: any) => Promise<any>;
    delete: (id: number) => Promise<void>;
  };

  orders: {
    getAll: () => Promise<any[]>;
    get: (id: number) => Promise<any>;
    search: (query: string) => Promise<any[]>;
    create: (data: any) => Promise<any>;
    update: (id: number, data: any) => Promise<any>;
    updateStatus: (id: number, status: string) => Promise<any>;
    getMeasurements: (orderId: number) => Promise<any>;
    updateMeasurements: (orderId: number, data: any) => Promise<any>;
    getTasks: (orderId: number) => Promise<any[]>;
    createTask: (data: any) => Promise<any>;
    updateTaskStatus: (taskId: number, status: string) => Promise<any>;
    reassignTask: (taskId: number, workerId: number, wageType: string, wageRate: number, wageAmount: number) => Promise<any>;
    getStats: () => Promise<any>;
    getAllTasks: (filters?: { branchId?: number; workerId?: number; taskType?: string }) => Promise<any[]>;
  };

  window: {
    minimize: () => Promise<void>;
    maximize: () => Promise<void>;
    close: () => Promise<void>;
    isMaximized: () => Promise<boolean>;
  };

  pieceTypes: {
    getAll: () => Promise<any[]>;
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
  },

  customers: {
    getAll: () => ipcRenderer.invoke('customers:getAll'),
    search: (query) => ipcRenderer.invoke('customers:search', query),
    create: (data) => ipcRenderer.invoke('customers:create', data),
    update: (id, data) => ipcRenderer.invoke('customers:update', id, data),
    delete: (id) => ipcRenderer.invoke('customers:delete', id),
  },

  orders: {
    getAll: () => ipcRenderer.invoke('orders:getAll'),
    get: (id) => ipcRenderer.invoke('orders:get', id),
    search: (query) => ipcRenderer.invoke('orders:search', query),
    create: (data) => ipcRenderer.invoke('orders:create', data),
    update: (id, data) => ipcRenderer.invoke('orders:update', id, data),
    updateStatus: (id, status) => ipcRenderer.invoke('orders:updateStatus', id, status),
    getMeasurements: (orderId) => ipcRenderer.invoke('orders:getMeasurements', orderId),
    updateMeasurements: (orderId, data) => ipcRenderer.invoke('orders:updateMeasurements', orderId, data),
    getTasks: (orderId) => ipcRenderer.invoke('orders:getTasks', orderId),
    createTask: (data) => ipcRenderer.invoke('orders:createTask', data),
    updateTaskStatus: (taskId, status) => ipcRenderer.invoke('orders:updateTaskStatus', taskId, status),
    reassignTask: (taskId, workerId, wageType, wageRate, wageAmount) => ipcRenderer.invoke('orders:reassignTask', taskId, workerId, wageType, wageRate, wageAmount),
    getStats: () => ipcRenderer.invoke('orders:getStats'),
    getAllTasks: (filters) => ipcRenderer.invoke('orders:getAllTasks', filters),
  },

  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  },

  pieceTypes: {
    getAll: () => ipcRenderer.invoke('pieceTypes:getAll'),
  },
};

contextBridge.exposeInMainWorld('electronAPI', api);
