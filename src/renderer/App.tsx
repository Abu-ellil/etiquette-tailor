import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useTranslation } from './contexts/I18nContext';
import LoginPage from './pages/Login';
import DashboardPage from './pages/Dashboard';
import CustomersPage from './pages/Customers';
import OrdersPage from './pages/Orders';
import NewOrderPage from './pages/NewOrder';
import WorkflowWizard from './pages/WorkflowWizard';
import OrderDetailPage from './pages/OrderDetail';
import MeasurementsPage from './pages/Measurements';
import WorkersPage from './pages/Workers';
import WorkerPayRatesPage from './pages/WorkerPayRates';
import WorkerWageReportPage from './pages/WorkerWageReport';
import SalarySummaryPage from './pages/SalarySummary';
import WorkerProductivityPage from './pages/WorkerProductivity';
import TaskManagementPage from './pages/TaskManagement';
import MyTasksPage from './pages/MyTasks';
import CuttingQueuePage from './pages/CuttingQueue';
import TaskBoardPage from './pages/TaskBoard';
import ProfitPage from './pages/Profit';
import AdvancedReportsPage from './pages/AdvancedReports';
import InvoicePage from './pages/Invoice';
import BackupPage from './pages/Backup';
import SettingsPage from './pages/Settings';
import NotificationsPage from './pages/Notifications';
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
  admin: ['/dashboard', '/customers', '/orders', '/orders/:id', '/workflow', '/measurements', '/workers', '/worker-rates', '/task-management', '/worker-wage-report', '/salary-summary', '/worker-productivity', '/task-board', '/profit', '/reports', '/advanced-reports', '/backup', '/settings', '/notifications'],
  manager: ['/dashboard', '/customers', '/orders', '/orders/:id', '/workflow', '/measurements', '/workers', '/worker-rates', '/task-management', '/worker-wage-report', '/salary-summary', '/worker-productivity', '/task-board', '/profit', '/reports', '/advanced-reports', '/notifications'],
  reception: ['/dashboard', '/customers', '/orders', '/orders/:id', '/workflow', '/measurements', '/notifications'],
  worker: ['/dashboard', '/my-tasks', '/cutting-queue', '/notifications'],
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
    const tailorRoutes = ['/dashboard', '/my-tasks', '/orders/:id'];
    const masterCutterRoutes = ['/dashboard', '/cutting-queue', '/orders/:id'];
    allowed = session.worker_type === 'master_cutter' ? masterCutterRoutes : tailorRoutes;
  }
  // Special case: workers can view specific order details but not the orders list
  if (session.role === 'worker' && path === '/orders/:id') {
    return <>{children}</>;
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

  // Keep localStorage in sync so pages can read session
  useEffect(() => {
    if (session) {
      localStorage.setItem('session', JSON.stringify(session));
    } else {
      localStorage.removeItem('session');
    }
  }, [session]);

  useEffect(() => {
    async function init() {
      try {
        const s = await window.electronAPI.auth.getSession();
        setSession(s as Session | null);
      } finally {
        setLoading(false);
      }
    }
    init();
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
            path="workflow"
            element={
              <ProtectedRoute path="/workflow" session={session}>
                <WorkflowWizard />
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
              <ProtectedRoute path="/orders/:id" session={session}>
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
            path="task-management"
            element={
              <ProtectedRoute path="/task-management" session={session}>
                <TaskManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="worker-wage-report"
            element={
              <ProtectedRoute path="/worker-wage-report" session={session}>
                <WorkerWageReportPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="salary-summary"
            element={
              <ProtectedRoute path="/salary-summary" session={session}>
                <SalarySummaryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="worker-productivity"
            element={
              <ProtectedRoute path="/worker-productivity" session={session}>
                <WorkerProductivityPage />
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
            path="profit"
            element={
              <ProtectedRoute path="/profit" session={session}>
                <ProfitPage />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="advanced-reports"
            element={
              <ProtectedRoute path="/advanced-reports" session={session}>
                <AdvancedReportsPage />
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
          <Route
            path="notifications"
            element={
              <ProtectedRoute path="/notifications" session={session}>
                <NotificationsPage />
              </ProtectedRoute>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </HashRouter>
  );
}
