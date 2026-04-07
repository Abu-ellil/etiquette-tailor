import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import TitleBar from './TitleBar';
import NotificationBell from './NotificationBell';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from '../contexts/I18nContext';

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
  // Main
  { path: '/dashboard', labelKey: 'Dashboard', icon: 'dashboard', section: 'main' },
  { path: '/customers', labelKey: 'Customers', icon: 'group', section: 'main' },
  { path: '/orders', labelKey: 'Orders', icon: 'shopping_bag', section: 'main' },
  { path: '/measurements', labelKey: 'Measurements', icon: 'straighten', section: 'main' },
  // Workers
  { path: '/workers', labelKey: 'Workers', icon: 'badge', section: 'workers' },
  { path: '/my-tasks', labelKey: 'My Tasks', icon: 'task_alt', workerTypes: ['tailor'], section: 'workers' },
  { path: '/cutting-queue', labelKey: 'Cutting Queue', icon: 'content_cut', workerTypes: ['master_cutter'], section: 'workers' },
  // Tasks
  { path: '/task-board', labelKey: 'Task Board', icon: 'view_kanban', roles: ['admin', 'manager'], section: 'tasks' },
  // Reports
  { path: '/profit', labelKey: 'Profit', icon: 'account_balance_wallet', roles: ['admin', 'manager'], section: 'reports' },
  { path: '/reports', labelKey: 'Reports', icon: 'assessment', section: 'reports' },
  { path: '/advanced-reports', labelKey: 'Advanced Reports', icon: 'analytics', roles: ['admin', 'manager'], section: 'reports' },
  // System
  { path: '/backup', labelKey: 'Backup', icon: 'settings_backup_restore', section: 'system' },
  { path: '/settings', labelKey: 'Settings', icon: 'settings', roles: ['admin'], section: 'system' },
];

const SECTION_LABELS: Record<string, string> = {
  main: '',
  workers: 'Workers',
  tasks: 'Tasks',
  reports: 'Reports',
  system: 'System',
};

const ROLE_ROUTES: Record<string, string[]> = {
  admin: ['/dashboard', '/customers', '/orders', '/measurements', '/workers', '/task-board', '/profit', '/reports', '/advanced-reports', '/backup', '/settings'],
  manager: ['/dashboard', '/customers', '/orders', '/measurements', '/workers', '/task-board', '/profit', '/reports', '/advanced-reports'],
  reception: ['/dashboard', '/customers', '/orders', '/measurements'],
  worker: ['/dashboard', '/my-tasks', '/cutting-queue'],
};

export default function AppLayout({ session, setSession }: AppLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const { theme, setTheme, isDark } = useTheme();
  const { t, isRTL } = useTranslation();

  let allowedRoutes = ROLE_ROUTES[session.role] || [];
  if (session.role === 'worker') {
    const tailorRoutes = ['/dashboard', '/my-tasks'];
    const cutterRoutes = ['/dashboard', '/cutting-queue'];
    allowedRoutes = session.worker_type === 'master_cutter' ? cutterRoutes : tailorRoutes;
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

  const handleNav = (path: string) => {
    navigate(path);
    setSidebarOpen(false);
  };

  const showNewOrder = !['tailor', 'master_cutter'].includes(session.worker_type || '') || session.role !== 'worker';

  const sidebarHiddenClass = isRTL ? 'translate-x-full' : '-translate-x-full';
  const sidebarShowClass = 'translate-x-0';
  const sidebarPositionClass = isRTL ? 'end-0' : 'start-0';
  const lgSidebarClass = isRTL ? 'lg:end-0' : 'lg:start-0';

  return (
    <div className="flex flex-col h-screen bg-surface">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden relative">
        {/* Overlay backdrop for small screens */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/30 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <aside className={`fixed inset-y-0 ${sidebarPositionClass} z-50 flex flex-col py-6 space-y-2 bg-surface-container-low transition-transform duration-300 w-72 h-screen pt-[calc(var(--titlebar-h,32px)+20px)] lg:static lg:z-auto lg:translate-x-0 lg:h-full lg:shrink-0 lg:overflow-y-auto lg:w-62 ${sidebarOpen ? sidebarShowClass : sidebarHiddenClass} ${lgSidebarClass}`}>
          <div className="px-8 mb-8 flex justify-start">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-container rounded-lg flex items-center justify-center text-white shrink-0">
                <span
                  className="material-symbols-outlined"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  straighten
                </span>
              </div>
              <div className="whitespace-nowrap">
                <h1 className="text-lg font-bold text-on-surface leading-tight font-headline">
                  {t('Etiquette Tailor')}
                </h1>
                <p className="text-[10px] font-headline font-semibold tracking-widest uppercase text-secondary">
                  {t('Bespoke Studio')}
                </p>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-0 space-y-1 overflow-y-auto">
            {visibleItems.map((item, idx) => {
              const isActive = location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
              const prevSection = idx > 0 ? visibleItems[idx - 1].section : null;
              const showDivider = item.section !== prevSection;
              return (
                <React.Fragment key={item.path}>
                  {showDivider && item.section !== 'main' && (
                    <div className="flex items-center gap-3 px-6 pt-3 pb-1">
                      <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-outline">{t(SECTION_LABELS[item.section!] || '')}</span>
                      <div className="flex-1 h-px bg-outline-variant/30" />
                    </div>
                  )}
                  <button
                    onClick={() => handleNav(item.path)}
                    title={t(item.labelKey)}
                    className={`flex items-center gap-3 px-4 py-3 mx-2 my-1 rounded-lg transition-all cursor-pointer w-[calc(100%-1rem)] text-start ${
                      isActive
                        ? 'bg-surface-container-lowest text-primary shadow-sm'
                        : 'text-on-surface-variant hover:bg-surface-container/50'
                    }`}
                  >
                    <span className="material-symbols-outlined shrink-0">{item.icon}</span>
                    <span className="font-headline text-sm font-semibold tracking-wide uppercase whitespace-nowrap">
                      {t(item.labelKey)}
                    </span>
                  </button>
                </React.Fragment>
              );
            })}
          </nav>

          <div className="px-6 mt-4 space-y-3">
            {showNewOrder && (
              <button
                onClick={() => handleNav('/workflow')}
                title={t('New Order')}
                className="btn-primary w-full py-3 lg:py-2 text-sm tracking-wide flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-sm shrink-0">add_circle</span>
                <span className="whitespace-nowrap">{t('New Order')}</span>
              </button>
            )}
            <button
              onClick={handleLogout}
              title={t('Logout')}
              className="w-full py-2 text-on-surface-variant hover:bg-surface-container/50 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <span className="whitespace-nowrap">{t('Logout')}</span>
            </button>
          </div>
        </aside>

        <main className="flex-1 flex flex-col min-h-0 bg-surface w-full">
          <header
            className="sticky top-0 z-30 h-20 bg-surface-container-lowest/85 backdrop-blur-xl shadow-[0px_20px_40px_rgba(25,28,29,0.06)] flex justify-between items-center px-4 md:px-8 w-full shrink-0"
            style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
          >
            <div style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 -ms-2 rounded-lg hover:bg-surface-container transition-colors"
                title={t('Toggle menu')}
              >
                <span className="material-symbols-outlined text-on-surface-variant">menu</span>
              </button>
            </div>
            <div
              className="flex items-center gap-4"
              style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            >
              <span className="text-sm text-on-surface-variant font-medium">{session.name}</span>
              <NotificationBell session={session} />
              <button
                onClick={() => setTheme(isDark ? 'light' : 'dark')}
                className="p-2 rounded-lg hover:bg-surface-container-high transition-colors text-on-surface-variant"
                title={isDark ? t('Switch to light mode') : t('Switch to dark mode')}
              >
                <span className="material-symbols-outlined">
                  {isDark ? 'light_mode' : 'dark_mode'}
                </span>
              </button>
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
