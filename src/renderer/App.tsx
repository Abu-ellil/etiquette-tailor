import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/Login';
import DashboardPage from './pages/Dashboard';
import CustomersPage from './pages/Customers';
import OrdersPage from './pages/Orders';
import MyTasksPage from './pages/MyTasks';
import WorkersPage from './pages/Workers';
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
  admin: ['/dashboard', '/customers', '/orders', '/my-tasks', '/workers', '/settings'],
  manager: ['/dashboard', '/customers', '/orders', '/workers'],
  reception: ['/dashboard', '/customers', '/orders'],
  worker: ['/dashboard', '/my-tasks'],
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
  const allowed = ROLE_ROUTES[session.role] || [];
  if (!allowed.includes(path)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.electronAPI
      .auth.getSession()
      .then((s: Session | null) => setSession(s))
      .catch(() => setSession(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-gray-500 text-lg">Loading...</div>
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
            path="my-tasks"
            element={
              <ProtectedRoute path="/my-tasks" session={session}>
                <MyTasksPage />
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
