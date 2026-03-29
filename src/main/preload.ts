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
    reassignTask: (taskId: number, workerId: number) => Promise<any>;
    getStats: () => Promise<any>;
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
    reassignTask: (taskId, workerId) => ipcRenderer.invoke('orders:reassignTask', taskId, workerId),
    getStats: () => ipcRenderer.invoke('orders:getStats'),
  },
};

contextBridge.exposeInMainWorld('electronAPI', api);
