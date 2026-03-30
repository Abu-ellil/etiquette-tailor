import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import TitleBar from './TitleBar';

interface Session {
  userId: number;
  username: string;
  name: string;
  role: string;
  branch_id: number;
  worker_type?: string | null;
}

interface AppLayoutProps {
  session: Session;
  setSession: React.Dispatch<React.SetStateAction<Session | null>>;
}

const SIDEBAR_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { path: '/customers', label: 'Customers', icon: 'group' },
  { path: '/measurements', label: 'Measurements', icon: 'straighten' },
  { path: '/orders', label: 'Orders', icon: 'shopping_bag' },
  { path: '/workers', label: 'Workers', icon: 'badge' },
  { path: '/worker-rates', label: 'Worker Rates', icon: 'payments' },
  { path: '/task-board', label: 'Task Board', icon: 'view_kanban', roles: ['admin', 'manager'] },
  { path: '/my-tasks', label: 'My Tasks', icon: 'task_alt', workerTypes: ['tailor'] },
  { path: '/cutting-queue', label: 'Cutting Queue', icon: 'content_cut', workerTypes: ['cutter'] },
  { path: '/reports', label: 'Reports', icon: 'assessment' },
  { path: '/backup', label: 'Backup', icon: 'settings_backup_restore' },
  { path: '/settings', label: 'Settings', icon: 'settings', roles: ['admin'] },
];

const ROLE_ROUTES: Record<string, string[]> = {
  admin: ['/dashboard', '/customers', '/measurements', '/orders', '/workers', '/worker-rates', '/task-board', '/reports', '/backup', '/settings'],
  manager: ['/dashboard', '/customers', '/measurements', '/orders', '/workers', '/task-board', '/reports'],
  reception: ['/dashboard', '/customers', '/measurements', '/orders'],
  worker: ['/dashboard', '/my-tasks', '/cutting-queue'],
};

export default function AppLayout({ session, setSession }: AppLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();

  let allowedRoutes = ROLE_ROUTES[session.role] || [];
  if (session.role === 'worker') {
    const tailorRoutes = ['/dashboard', '/my-tasks'];
    const cutterRoutes = ['/dashboard', '/cutting-queue'];
    allowedRoutes = session.worker_type === 'cutter' ? cutterRoutes : tailorRoutes;
  }

  const visibleItems = SIDEBAR_ITEMS.filter((item) => {
    if (item.roles && !item.roles.includes(session.role)) return false;
    if (item.workerTypes && session.role === 'worker') {
      if (!item.workerTypes.includes(session.worker_type || '')) return false;
    }
    if (item.workerTypes && session.role !== 'worker') return false;
    return allowedRoutes.includes(item.path);
  });

  const handleLogout = async () => {
    await window.electronAPI.auth.logout();
    setSession(null);
  };

  const showNewOrder = !['tailor', 'cutter'].includes(session.worker_type || '') || session.role !== 'worker';

  return (
    <div className="flex flex-col h-screen bg-surface">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden relative">
        <aside className="h-full w-16 lg:w-72 shrink-0 overflow-y-auto flex flex-col py-6 space-y-2 bg-gradient-to-r from-slate-50 to-slate-100 transition-all duration-300">
          <div className="px-0 lg:px-8 mb-8 flex justify-center lg:justify-start">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-container rounded-lg flex items-center justify-center text-white shrink-0">
                <span
                  className="material-symbols-outlined"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  straighten
                </span>
              </div>
              <div className="hidden lg:block whitespace-nowrap">
                <h1 className="text-lg font-bold text-slate-800 leading-tight font-headline">
                  Etiquette Tailor
                </h1>
                <p className="text-[10px] font-headline font-semibold tracking-widest uppercase text-secondary">
                  Bespoke Studio
                </p>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-2 lg:px-4 space-y-1">
            {visibleItems.map((item) => {
              const isActive = location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  title={item.label}
                  className={`flex items-center justify-center lg:justify-start gap-3 px-0 lg:px-4 py-3 mx-1 lg:mx-2 my-1 rounded-lg transition-all cursor-pointer w-auto lg:w-full text-left ${
                    isActive
                      ? 'bg-white text-purple-700 shadow-sm'
                      : 'text-slate-500 hover:bg-slate-200/50 hover:translate-x-1'
                  }`}
                >
                  <span className="material-symbols-outlined shrink-0">{item.icon}</span>
                  <span className="hidden lg:block font-headline text-sm font-semibold tracking-wide uppercase whitespace-nowrap">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </nav>

          <div className="px-3 lg:px-6 mt-8 space-y-3">
            {showNewOrder && (
              <button
                onClick={() => navigate('/orders/new')}
                title="New Order"
                className="btn-primary w-full py-3 lg:py-4 text-sm tracking-wide flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-lg lg:text-sm shrink-0">add_circle</span>
                <span className="hidden lg:block whitespace-nowrap">New Order</span>
              </button>
            )}
            <button
              onClick={handleLogout}
              title="Logout"
              className="w-full py-2.5 text-slate-500 hover:bg-slate-200/50 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined lg:hidden shrink-0">logout</span>
              <span className="hidden lg:block whitespace-nowrap">Logout</span>
            </button>
          </div>
        </aside>

        <main className="flex-1 flex flex-col min-h-0 bg-surface">
          <header
            className="sticky top-0 z-30 h-20 bg-white/85 backdrop-blur-xl shadow-[0px_20px_40px_rgba(25,28,29,0.06)] flex justify-between items-center px-4 md:px-8 w-full shrink-0"
            style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
          >
            <div />
            <div
              className="flex items-center gap-4"
              style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            >
              <span className="text-sm text-on-surface-variant font-medium">{session.name}</span>
              <span className="chip chip-progress capitalize">{session.role}</span>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-10">
            <div className="max-w-[1600px] mx-auto">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
