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

  notifications: {
    getForUser: (userId: number, role: string, limit?: number) => Promise<any[]>;
    getUnreadCount: (userId: number, role: string) => Promise<number>;
    markAsRead: (notificationId: number) => Promise<void>;
    markAllAsRead: (userId: number, role: string) => Promise<void>;
    softDelete: (notificationId: number) => Promise<void>;
    generateOverdue: () => Promise<number>;
  };

  backup: {
    create: () => Promise<{ success: boolean; error?: string }>;
    restore: () => Promise<{ success: boolean; error?: string }>;
    list: () => Promise<Array<{ name: string; date: string; size: string }>>;
    lastDate: () => Promise<string | null>;
    dbSize: () => Promise<{ usedBytes: number; label: string }>;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
