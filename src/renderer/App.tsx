import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useTranslation } from './contexts/I18nContext';
import LoginPage from './pages/Login';
import DashboardPage from './pages/Dashboard';
import CustomersPage from './pages/Customers';
import OrdersPage from './pages/Orders';
import NewOrderPage from './pages/NewOrder';
import OrderDetailPage from './pages/OrderDetail';
import MeasurementsPage from './pages/Measurements';
import WorkersPage from './pages/Workers';
import WorkerPayRatesPage from './pages/WorkerPayRates';
import MyTasksPage from './pages/MyTasks';
import CuttingQueuePage from './pages/CuttingQueue';
import TaskBoardPage from './pages/TaskBoard';
import ReportsPage from './pages/Reports';
import InvoicePage from './pages/Invoice';
import BackupPage from './pages/Backup';
import SettingsPage from './pages/Settings';
import AppLayout from './components/AppLayout';

export interface Session {
  userId: number;
  username: string;
  name: string;
  role: string;
  branch_id: number;
  worker_type?: string | null;
}

const ROLE_ROUTES: Record<string, string[]> = {
  admin: ['/dashboard', '/customers', '/orders', '/measurements', '/workers', '/worker-rates', '/task-board', '/reports', '/backup', '/settings'],
  manager: ['/dashboard', '/customers', '/orders', '/measurements', '/workers', '/task-board', '/reports'],
  reception: ['/dashboard', '/customers', '/orders', '/measurements'],
  worker: ['/dashboard', '/my-tasks', '/cutting-queue'],
};

function ProtectedRoute({
  path,
  session,
  children,
}: {
  path: string;
  session: Session | null;
  children: React.ReactNode;
}) {
  if (!session) return <Navigate to="/login" replace />;
  let allowed = ROLE_ROUTES[session.role] || [];
  if (session.role === 'worker') {
    const tailorRoutes = ['/dashboard', '/my-tasks'];
    const masterCutterRoutes = ['/dashboard', '/cutting-queue'];
    allowed = session.worker_type === 'master_cutter' ? masterCutterRoutes : tailorRoutes;
  }
  if (!allowed.includes(path)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function App() {
  const { t, isRTL } = useTranslation();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
  }, [isRTL]);

  useEffect(() => {
    window.electronAPI
      .auth.getSession()
      .then((s: Session | null) => setSession(s))
      .catch(() => setSession(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-surface">
        <div className="text-on-surface-variant text-lg">{t('Loading...')}</div>
      </div>
    );
  }

  return (
    <HashRouter>
      <Routes>
        <Route
          path="/login"
          element={
            session ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <LoginPage onLogin={setSession} />
            )
          }
        />
        <Route
          path="/"
          element={
            session ? (
              <AppLayout session={session} setSession={setSession} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route
            path="dashboard"
            element={
              <ProtectedRoute path="/dashboard" session={session}>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="customers"
            element={
              <ProtectedRoute path="/customers" session={session}>
                <CustomersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="orders"
            element={
              <ProtectedRoute path="/orders" session={session}>
                <OrdersPage />
              </ProtectedRoute>
            }
          />
            <Route
              path="measurements"
              element={
                <ProtectedRoute path="/measurements" session={session}>
                  <MeasurementsPage />
                </ProtectedRoute>
              }
            />
          <Route
            path="orders/new"
            element={
              <ProtectedRoute path="/orders" session={session}>
                <NewOrderPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="orders/:id"
            element={
              <ProtectedRoute path="/orders" session={session}>
                <OrderDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="workers"
            element={
              <ProtectedRoute path="/workers" session={session}>
                <WorkersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="worker-rates"
            element={
              <ProtectedRoute path="/worker-rates" session={session}>
                <WorkerPayRatesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="my-tasks"
            element={
              <ProtectedRoute path="/my-tasks" session={session}>
                <MyTasksPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="cutting-queue"
            element={
              <ProtectedRoute path="/cutting-queue" session={session}>
                <CuttingQueuePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="task-board"
            element={
              <ProtectedRoute path="/task-board" session={session}>
                <TaskBoardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="reports"
            element={
              <ProtectedRoute path="/reports" session={session}>
                <ReportsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="invoice/:id"
            element={
              <ProtectedRoute path="/orders" session={session}>
                <InvoicePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="backup"
            element={
              <ProtectedRoute path="/backup" session={session}>
                <BackupPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="settings"
            element={
              <ProtectedRoute path="/settings" session={session}>
                <SettingsPage />
              </ProtectedRoute>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </HashRouter>
  );
}
