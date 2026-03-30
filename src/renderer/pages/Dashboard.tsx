import React, { useEffect, useState } from 'react';
import { format, parseISO, isPast } from 'date-fns';

interface OrderStats {
  total: number;
  in_progress: number;
  ready: number;
  delivered: number;
  overdue: number;
  revenue: number;
}

interface Order {
  id: number;
  order_number: string;
  customer_name?: string;
  piece_type: string;
  details?: string;
  status: string;
  delivery_date?: string;
  price: number;
  paid: number;
}

function getInitials(name?: string): string {
  if (!name) return '--';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return parts[0].substring(0, 2).toUpperCase();
}

function getStatusChip(status: string, isLate: boolean) {
  if (isLate) {
    return <span className="chip chip-late">Late</span>;
  }
  switch (status) {
    case 'ready':
      return <span className="chip chip-ready">Ready</span>;
    case 'delivered':
      return <span className="chip chip-delivered">Delivered</span>;
    default:
      return <span className="chip chip-progress">In Progress</span>;
  }
}

function isOrderLate(order: Order): boolean {
  if (order.status === 'delivered') return false;
  if (!order.delivery_date) return false;
  try {
    return isPast(parseISO(order.delivery_date));
  } catch {
    return false;
  }
}

function formatRevenue(amount: number): string {
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}k QAR`;
  }
  return `${amount.toFixed(0)} QAR`;
}

function formatNumber(n: number): string {
  return n.toLocaleString();
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '--';
  try {
    return format(parseISO(dateStr), 'MMM d, yyyy');
  } catch {
    return dateStr;
  }
}

// Color rotation for avatar circles
const AVATAR_COLORS = [
  { bg: 'bg-primary-fixed', text: 'text-on-primary-fixed' },
  { bg: 'bg-surface-container-high', text: 'text-on-surface-variant' },
  { bg: 'bg-error-container', text: 'text-on-error-container' },
  { bg: 'bg-secondary-container', text: 'text-on-secondary' },
  { bg: 'bg-tertiary-fixed', text: 'text-on-tertiary-fixed' },
  { bg: 'bg-surface-container-highest', text: 'text-on-surface-variant' },
];

function getAvatarColor(index: number) {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workerTasks, setWorkerTasks] = useState<any[]>([]);
  const [allTasks, setAllTasks] = useState<any[]>([]);

  const session = React.useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('session') || '{}');
    } catch {
      return {};
    }
  }, []);

  const isWorker = session.role === 'worker';
  const isTailor = isWorker && session.worker_type === 'tailor';
  const isCutter = isWorker && session.worker_type === 'master_cutter';
  const isManager = session.role === 'manager';

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);

        if (isWorker) {
          const tasks = await window.electronAPI.workers.getWorkerTasks(session.userId);
          setWorkerTasks(tasks || []);
        } else {
          const [statsData, ordersData] = await Promise.all([
            window.electronAPI.orders.getStats(),
            window.electronAPI.orders.getAll(),
          ]);
          setStats(statsData);
          setOrders((ordersData || []).slice(0, 5));

          const tasks = await window.electronAPI.orders.getAllTasks({});
          setAllTasks(tasks || []);
        }
      } catch (err: unknown) {
        console.error('Failed to load dashboard data:', err);
        const message = err instanceof Error ? err.message : 'Failed to load dashboard data. Please try again.';
        setError(message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [isWorker, isTailor, isCutter, session.userId]);

  if (loading) {
    return (
      <div className="space-y-12 pb-20">
        {/* Stats skeleton */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="bg-surface-container-lowest p-6 rounded-xl h-40 animate-pulse"
            >
              <div className="flex justify-between items-start">
                <div className="w-6 h-6 bg-surface-container-high rounded" />
                <div className="w-20 h-3 bg-surface-container-high rounded" />
              </div>
              <div className="mt-4">
                <div className="w-16 h-8 bg-surface-container-high rounded" />
                <div className="w-24 h-3 bg-surface-container-high rounded mt-2" />
              </div>
            </div>
          ))}
        </section>
        {/* Table skeleton */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-4 space-y-4">
            <div className="h-6 w-40 bg-surface-container-high rounded animate-pulse" />
            <div className="h-32 bg-surface-container-lowest rounded-lg animate-pulse" />
            <div className="h-32 bg-surface-container-lowest rounded-lg animate-pulse" />
          </div>
          <div className="lg:col-span-8">
            <div className="h-6 w-40 bg-surface-container-high rounded mb-8 animate-pulse" />
            <div className="h-64 bg-surface-container-lowest rounded-xl animate-pulse" />
          </div>
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <span className="material-symbols-outlined text-5xl text-error">error</span>
        <p className="text-on-surface-variant text-sm">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="btn-primary text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  const safeStats = stats || { total: 0, in_progress: 0, ready: 0, delivered: 0, overdue: 0, revenue: 0 };

  if (isTailor || isCutter) {
    return <WorkerDashboard tasks={workerTasks} isCutter={isCutter} loading={loading} />;
  }

  const taskCounts = {
    pending: allTasks.filter((t: any) => t.status === 'pending').length,
    in_progress: allTasks.filter((t: any) => t.status === 'in_progress').length,
    done: allTasks.filter((t: any) => t.status === 'done').length,
  };

  return (
    <div className="space-y-12 pb-20">
      {/* Stats Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {/* Total Orders */}
        <div className="bg-surface-container-lowest p-6 rounded-xl border-b-2 border-primary/10 flex flex-col justify-between h-40 group hover:bg-primary-container transition-all duration-300">
          <div className="flex justify-between items-start">
            <span className="material-symbols-outlined text-primary group-hover:text-white transition-colors">
              assignment
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-secondary group-hover:text-white/60 transition-colors">
              Total Orders
            </span>
          </div>
          <div className="mt-4">
            <span className="text-4xl font-headline font-extrabold text-on-surface group-hover:text-white transition-colors">
              {formatNumber(safeStats.total)}
            </span>
            <p className="text-xs text-secondary group-hover:text-white/80 transition-colors mt-1">
              All time orders
            </p>
          </div>
        </div>

        {/* In Progress */}
        <div className="bg-surface-container-lowest p-6 rounded-xl border-b-2 border-primary-fixed/50 flex flex-col justify-between h-40">
          <div className="flex justify-between items-start">
            <span
              className="material-symbols-outlined text-on-primary-fixed-variant"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              watch_later
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-secondary">
              In Progress
            </span>
          </div>
          <div className="mt-4">
            <span className="text-4xl font-headline font-extrabold text-on-surface">
              {formatNumber(safeStats.in_progress)}
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2 h-2 rounded-full bg-primary-fixed" />
              <p className="text-xs text-secondary">Active on floor</p>
            </div>
          </div>
        </div>

        {/* Ready */}
        <div className="bg-surface-container-lowest p-6 rounded-xl border-b-2 border-tertiary-fixed/50 flex flex-col justify-between h-40">
          <div className="flex justify-between items-start">
            <span
              className="material-symbols-outlined text-on-tertiary-fixed-variant"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              check_circle
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-secondary">
              Ready
            </span>
          </div>
          <div className="mt-4">
            <span className="text-4xl font-headline font-extrabold text-on-surface">
              {formatNumber(safeStats.ready)}
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2 h-2 rounded-full bg-tertiary-fixed" />
              <p className="text-xs text-secondary">Awaiting pickup</p>
            </div>
          </div>
        </div>

        {/* Delivered */}
        <div className="bg-surface-container-lowest p-6 rounded-xl border-b-2 border-secondary/10 flex flex-col justify-between h-40">
          <div className="flex justify-between items-start">
            <span
              className="material-symbols-outlined text-secondary"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              local_shipping
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-secondary">
              Delivered
            </span>
          </div>
          <div className="mt-4">
            <span className="text-4xl font-headline font-extrabold text-on-surface">
              {formatNumber(safeStats.delivered)}
            </span>
            <p className="text-xs text-secondary mt-1">Total fulfilled</p>
          </div>
        </div>

        {/* Revenue */}
        {!isManager && (
          <div className="bg-surface-container-lowest p-6 rounded-xl border-b-2 border-primary/20 flex flex-col justify-between h-40">
            <div className="flex justify-between items-start">
              <span
                className="material-symbols-outlined text-primary"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                payments
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-secondary">
                Revenue
              </span>
            </div>
            <div className="mt-4">
              <span className="text-3xl font-headline font-extrabold text-on-surface">
                {formatRevenue(safeStats.revenue)}
              </span>
              <p className="text-xs text-secondary mt-1">Open order value</p>
            </div>
          </div>
        )}
        {isManager && (
          <div className="bg-surface-container-lowest p-6 rounded-xl border-b-2 border-primary/20 flex flex-col justify-between h-40">
            <div className="flex justify-between items-start">
              <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                task_alt
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-secondary">
                Tasks Done
              </span>
            </div>
            <div className="mt-4">
              <span className="text-4xl font-headline font-extrabold text-on-surface">
                {formatNumber(taskCounts.done)}
              </span>
              <p className="text-xs text-secondary mt-1">Completed tasks</p>
            </div>
          </div>
        )}
      </section>

      {/* Production Summary (Admin/Manager) */}
      {allTasks.length > 0 && (
        <section className="bg-surface-container-lowest rounded-xl p-8">
          <h3 className="text-xl font-headline font-bold text-on-surface mb-6">Production Summary</h3>
          <div className="grid grid-cols-3 gap-6">
            <div className="bg-surface rounded-lg p-5 text-center">
              <span className="text-3xl font-headline font-bold text-on-surface">{taskCounts.pending}</span>
              <p className="text-xs text-secondary mt-1 uppercase font-bold tracking-wider">Pending</p>
            </div>
            <div className="bg-primary-fixed rounded-lg p-5 text-center">
              <span className="text-3xl font-headline font-bold text-on-primary-fixed">{taskCounts.in_progress}</span>
              <p className="text-xs text-on-primary-fixed-variant mt-1 uppercase font-bold tracking-wider">In Progress</p>
            </div>
            <div className="bg-tertiary-fixed rounded-lg p-5 text-center">
              <span className="text-3xl font-headline font-bold text-on-tertiary-fixed">{taskCounts.done}</span>
              <p className="text-xs text-on-tertiary-fixed-variant mt-1 uppercase font-bold tracking-wider">Done</p>
            </div>
          </div>
        </section>
      )}

      {/* Alerts & Latest Orders */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Alerts Section */}
        <div className="lg:col-span-4 space-y-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xl font-headline font-bold text-on-surface">
              Critical Alerts
            </h3>
            {safeStats.overdue > 0 && (
              <span className="px-2 py-1 bg-error-container text-on-error-container text-[10px] font-bold rounded uppercase">
                Action Required
              </span>
            )}
          </div>

          <div className="space-y-4">
            {/* Late Orders Alert */}
            <div
              className={`p-5 rounded-lg border-l-4 flex gap-4 ${
                safeStats.overdue > 0
                  ? 'bg-error-container/30 border-error'
                  : 'bg-surface-container-low border-outline-variant'
              }`}
            >
              <span
                className={`material-symbols-outlined ${
                  safeStats.overdue > 0 ? 'text-error' : 'text-on-surface-variant'
                }`}
              >
                warning
              </span>
              <div>
                <h4 className="font-bold text-on-error-container text-sm">
                  {safeStats.overdue > 0
                    ? `${safeStats.overdue} Late Order${safeStats.overdue !== 1 ? 's' : ''}`
                    : 'No Late Orders'}
                </h4>
                <p className="text-xs text-on-error-container/80 mt-1">
                  {safeStats.overdue > 0
                    ? 'Overdue delivery dates. Immediate attention required.'
                    : 'All orders are on schedule.'}
                </p>
              </div>
            </div>

            {/* Ready for Pickup Alert */}
            <div
              className={`p-5 rounded-lg border-l-4 flex gap-4 ${
                safeStats.ready > 0
                  ? 'bg-tertiary-fixed/30 border-tertiary'
                  : 'bg-surface-container-low border-outline-variant'
              }`}
            >
              <span
                className={`material-symbols-outlined ${
                  safeStats.ready > 0 ? 'text-tertiary' : 'text-on-surface-variant'
                }`}
              >
                notifications_active
              </span>
              <div>
                <h4 className="font-bold text-on-tertiary-container text-sm">
                  {safeStats.ready > 0
                    ? `${safeStats.ready} Ready for Pickup`
                    : 'No Ready Orders'}
                </h4>
                <p className="text-xs text-on-tertiary-container/80 mt-1">
                  {safeStats.ready > 0
                    ? 'Orders awaiting customer collection.'
                    : 'All ready orders have been picked up.'}
                </p>
              </div>
            </div>

            {/* Studio Insights Card */}
            <div className="bg-surface-container-low p-6 rounded-xl flex flex-col items-center justify-center text-center space-y-3 h-48">
              <span className="material-symbols-outlined text-4xl text-primary">
                insights
              </span>
              <h4 className="font-headline font-bold text-on-surface">
                Workshop Summary
              </h4>
              <p className="text-xs text-secondary max-w-[200px]">
                {safeStats.total > 0
                  ? `${formatNumber(safeStats.in_progress)} in progress, ${formatNumber(safeStats.ready)} ready, ${formatNumber(safeStats.delivered)} delivered.`
                  : 'No orders yet. Create your first order to get started.'}
              </p>
            </div>
          </div>
        </div>

        {/* Latest Orders Table */}
        <div className="lg:col-span-8">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-headline font-bold text-on-surface">
              Latest Orders
            </h3>
          </div>

          {orders.length === 0 ? (
            <div className="bg-surface-container-lowest rounded-xl p-12 flex flex-col items-center justify-center text-center space-y-3">
              <span className="material-symbols-outlined text-5xl text-on-surface-variant">
                inbox
              </span>
              <h4 className="font-headline font-bold text-on-surface-variant">
                No Orders Yet
              </h4>
              <p className="text-xs text-secondary max-w-[260px]">
                Orders will appear here once created. Use the "New Order" button to get started.
              </p>
            </div>
          ) : (
            <div className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Item</th>
                    <th>Status</th>
                    <th>Delivery</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order, index) => {
                    const late = isOrderLate(order);
                    const avatarColor = getAvatarColor(index);
                    return (
                      <tr key={order.id}>
                        <td className="text-sm font-mono font-bold text-primary">
                          {order.order_number}
                        </td>
                        <td>
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-full ${avatarColor.bg} flex items-center justify-center text-[10px] font-bold ${avatarColor.text}`}
                            >
                              {getInitials(order.customer_name)}
                            </div>
                            <span className="text-sm font-semibold text-on-surface">
                              {order.customer_name || 'Unknown'}
                            </span>
                          </div>
                        </td>
                        <td className="text-sm text-secondary">
                          {order.piece_type}
                        </td>
                        <td>{getStatusChip(order.status, late)}</td>
                        <td
                          className={`text-sm ${
                            late ? 'text-error font-medium' : 'text-secondary'
                          }`}
                        >
                          {formatDate(order.delivery_date)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function WorkerDashboard({ tasks, isCutter, loading }: { tasks: any[]; isCutter: boolean; loading: boolean }) {
  const session = React.useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('session') || '{}');
    } catch {
      return {};
    }
  }, []);

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [earnings, setEarnings] = useState<any>(null);
  const [branchName, setBranchName] = useState<string>('--');

  // Load earnings for selected month
  React.useEffect(() => {
    async function load() {
      if (!session.userId) return;
      try {
        const data = await window.electronAPI.workers.getMonthlyEarnings(session.userId, selectedMonth);
        setEarnings(data);
      } catch {
        setEarnings({ task_count: 0, piece_earnings: 0, fixed_salary: 0, total_earnings: 0 });
      }
    }
    load();
  }, [session.userId, selectedMonth]);

  // Load branch name
  React.useEffect(() => {
    async function load() {
      if (!session.branch_id) return;
      try {
        const branch = await window.electronAPI.branches.getById(session.branch_id);
        if (branch) setBranchName(branch.name_en || branch.name_ar || '--');
      } catch {}
    }
    load();
  }, [session.branch_id]);

  const filtered = isCutter
    ? tasks.filter((t) => t.task_type === 'cutting')
    : tasks;

  const pendingCount = filtered.filter((t) => t.status === 'pending').length;
  const inProgressCount = filtered.filter((t) => t.status === 'in_progress').length;
  const doneToday = filtered.filter((t) => {
    if (t.status !== 'done' || !t.completed_at) return false;
    return new Date(t.completed_at).toDateString() === new Date().toDateString();
  }).length;

  const workerTypeLabel = session.worker_type === 'master_cutter' ? 'Master Cutter' : 'Tailor';

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="bg-surface-container-lowest p-8 rounded-xl h-40 animate-pulse" />
        <div className="grid grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-surface-container-lowest p-6 rounded-xl h-32 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Profile Card */}
      <div className="bg-surface-container-lowest p-8 rounded-xl flex items-center gap-6">
        <div className="w-16 h-16 rounded-full bg-primary-fixed text-on-primary-fixed flex items-center justify-center font-bold text-xl shrink-0">
          {getInitials(session.name)}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-headline font-extrabold text-on-surface truncate">{session.name}</h2>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-secondary">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-base">{isCutter ? 'content_cut' : 'styler'}</span>
              {workerTypeLabel}
            </span>
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-base">store</span>
              {branchName}
            </span>
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-base">payments</span>
              {(earnings?.fixed_salary || 0).toLocaleString()} QAR base
            </span>
          </div>
        </div>
      </div>

      {/* Task Stats */}
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-surface-container-lowest p-6 rounded-xl border-b-2 border-primary/20 flex flex-col justify-between h-32">
          <span className="text-[10px] font-bold uppercase tracking-widest text-secondary">Pending</span>
          <span className="text-4xl font-headline font-extrabold text-on-surface">{pendingCount}</span>
        </div>
        <div className="bg-primary-fixed p-6 rounded-xl flex flex-col justify-between h-32">
          <span className="text-[10px] font-bold uppercase tracking-widest text-on-primary-fixed-variant">In Progress</span>
          <span className="text-4xl font-headline font-extrabold text-on-primary-fixed">{inProgressCount}</span>
        </div>
        <div className="bg-tertiary-fixed p-6 rounded-xl flex flex-col justify-between h-32">
          <span className="text-[10px] font-bold uppercase tracking-widest text-on-tertiary-fixed-variant">Done Today</span>
          <span className="text-4xl font-headline font-extrabold text-on-tertiary-fixed">{doneToday}</span>
        </div>
      </div>

      {/* Earnings + Task List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Monthly Earnings */}
        <div className="lg:col-span-4">
          <div className="bg-surface-container-lowest rounded-xl p-6 space-y-5">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-headline font-bold text-on-surface">Earnings</h3>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-surface-container-high text-xs px-2 py-1 rounded border-none outline-none cursor-pointer"
              />
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-secondary">Piece Earnings</span>
                <span className="font-semibold">{(earnings?.piece_earnings || 0).toLocaleString()} QAR</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-secondary">Base Salary</span>
                <span className="font-semibold">{(earnings?.fixed_salary || 0).toLocaleString()} QAR</span>
              </div>
              <div className="h-px bg-outline-variant/20" />
              <div className="flex justify-between">
                <span className="font-bold">Total</span>
                <span className="font-bold text-primary text-lg">{(earnings?.total_earnings || 0).toLocaleString()} QAR</span>
              </div>
            </div>
            <p className="text-xs text-secondary">{earnings?.task_count || 0} completed tasks</p>
          </div>
        </div>

        {/* Task List */}
        <div className="lg:col-span-8">
          <h3 className="text-lg font-headline font-bold text-on-surface mb-4">
            {isCutter ? 'Cutting Queue' : 'My Tasks'}
          </h3>
          <div className="space-y-3">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-secondary">
                <span className="material-symbols-outlined text-5xl mb-3 text-outline">{isCutter ? 'content_cut' : 'checklist'}</span>
                <p className="font-semibold text-on-surface">No tasks assigned</p>
                <p className="text-sm mt-1">Tasks will appear here when assigned to you.</p>
              </div>
            ) : (
              filtered
                .sort((a, b) => {
                  const order: Record<string, number> = { in_progress: 0, pending: 1, done: 2 };
                  return (order[a.status] ?? 3) - (order[b.status] ?? 3);
                })
                .map((task) => (
                  <div key={task.task_id} className="bg-surface-container-lowest rounded-xl p-5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        task.status === 'done' ? 'bg-tertiary-fixed text-on-tertiary-fixed'
                        : task.status === 'in_progress' ? 'bg-primary-fixed text-on-primary-fixed'
                        : 'bg-surface-container-high text-on-surface-variant'
                      }`}>
                        {task.status === 'in_progress' ? 'In Progress' : task.status === 'done' ? 'Done' : 'Pending'}
                      </span>
                      <div>
                        <span className="font-bold text-on-surface">{task.order_number}</span>
                        <span className="text-secondary mx-2">·</span>
                        <span className="text-sm text-secondary">{task.piece_type}</span>
                      </div>
                    </div>
                    <div className="text-sm text-secondary">
                      {task.due_date ? `Due: ${formatDate(task.due_date)}` : ''}
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
