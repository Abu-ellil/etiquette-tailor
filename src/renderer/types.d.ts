export interface ElectronAPI {
  getAllCustomers: () => Promise<any[]>;
  getCustomer: (id: number) => Promise<any>;
  createCustomer: (data: any) => Promise<number>;
  updateCustomer: (id: number, data: any) => Promise<void>;
  deleteCustomer: (id: number) => Promise<void>;

  getAllOrders: () => Promise<any[]>;
  getOrder: (id: number) => Promise<any>;
  createOrder: (data: any) => Promise<number>;
  updateOrder: (id: number, data: any) => Promise<void>;
  deleteOrder: (id: number) => Promise<void>;

  getAllWorkers: () => Promise<any[]>;
  getWorker: (id: number) => Promise<any>;
  createWorker: (data: any) => Promise<number>;
  updateWorker: (id: number, data: any) => Promise<void>;
  deleteWorker: (id: number) => Promise<void>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
