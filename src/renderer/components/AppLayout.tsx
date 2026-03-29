import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import type { Session } from '../App';

interface AppLayoutProps {
  session: Session;
  setSession: React.Dispatch<React.SetStateAction<Session | null>>;
}

const SIDEBAR_ITEMS = [
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/customers', label: 'Customers' },
  { path: '/orders', label: 'Orders' },
  { path: '/my-tasks', label: 'My Tasks' },
  { path: '/workers', label: 'Workers' },
  { path: '/settings', label: 'Settings' },
];

const ROLE_ROUTES: Record<string, string[]> = {
  admin: ['/dashboard', '/customers', '/orders', '/my-tasks', '/workers', '/settings'],
  manager: ['/dashboard', '/customers', '/orders', '/workers'],
  reception: ['/dashboard', '/customers', '/orders'],
  worker: ['/dashboard', '/my-tasks'],
};

export default function AppLayout({ session, setSession }: AppLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const allowedRoutes = ROLE_ROUTES[session.role] || [];
  const visibleItems = SIDEBAR_ITEMS.filter((item) =>
    allowedRoutes.includes(item.path),
  );

  const handleLogout = async () => {
    await window.electronAPI.auth.logout();
    setSession(null);
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <aside className="w-60 bg-white border-r border-gray-200 flex flex-col shrink-0">
        <div className="h-14 flex items-center px-5 border-b border-gray-200">
          <h1 className="text-lg font-bold text-gray-900">Etiquette Tailor</h1>
        </div>

        <nav className="flex-1 py-3 px-3 space-y-1 overflow-y-auto">
          {visibleItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === item.path
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-200 space-y-2">
          <button
            onClick={() => navigate('/orders')}
            className="w-full py-2.5 px-3 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            + New Order
          </button>
          <button
            onClick={handleLogout}
            className="w-full py-2.5 px-3 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors"
          >
            Logout
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
          <div />
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{session.name}</span>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full capitalize">
              {session.role}
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
