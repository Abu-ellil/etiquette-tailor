import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Database operations will be exposed here
  getAllCustomers: () => ipcRenderer.invoke('db:getAllCustomers'),
  getCustomer: (id: number) => ipcRenderer.invoke('db:getCustomer', id),
  createCustomer: (data: any) => ipcRenderer.invoke('db:createCustomer', data),
  updateCustomer: (id: number, data: any) => ipcRenderer.invoke('db:updateCustomer', id, data),
  deleteCustomer: (id: number) => ipcRenderer.invoke('db:deleteCustomer', id),

  // Orders
  getAllOrders: () => ipcRenderer.invoke('db:getAllOrders'),
  getOrder: (id: number) => ipcRenderer.invoke('db:getOrder', id),
  createOrder: (data: any) => ipcRenderer.invoke('db:createOrder', data),
  updateOrder: (id: number, data: any) => ipcRenderer.invoke('db:updateOrder', id, data),
  deleteOrder: (id: number) => ipcRenderer.invoke('db:deleteOrder', id),

  // Workers
  getAllWorkers: () => ipcRenderer.invoke('db:getAllWorkers'),
  getWorker: (id: number) => ipcRenderer.invoke('db:getWorker', id),
  createWorker: (data: any) => ipcRenderer.invoke('db:createWorker', data),
  updateWorker: (id: number, data: any) => ipcRenderer.invoke('db:updateWorker', id, data),
  deleteWorker: (id: number) => ipcRenderer.invoke('db:deleteWorker', id),
});
