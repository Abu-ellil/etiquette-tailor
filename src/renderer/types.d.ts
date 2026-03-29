export interface Session {
  userId: number;
  username: string;
  name: string;
  role: string;
  branch_id: number;
  worker_type?: string | null;
}

export interface ElectronAPI {
  auth: {
    login: (credentials: { username: string; password: string }) => Promise<Session | null>;
    getSession: () => Promise<Session | null>;
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
    getActiveRate: (workerId: number) => Promise<any>;
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

  window: {
    minimize: () => Promise<void>;
    maximize: () => Promise<void>;
    close: () => Promise<void>;
    isMaximized: () => Promise<boolean>;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
