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
    return `$${(amount / 1000).toFixed(1)}k`;
  }
  return `$${amount.toFixed(0)}`;
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
  { bg: 'bg-purple-100', text: 'text-purple-700' },
  { bg: 'bg-slate-200', text: 'text-slate-700' },
  { bg: 'bg-rose-100', text: 'text-rose-700' },
  { bg: 'bg-blue-100', text: 'text-blue-700' },
  { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  { bg: 'bg-amber-100', text: 'text-amber-700' },
];

function getAvatarColor(index: number) {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [statsData, ordersData] = await Promise.all([
          window.electronAPI.orders.getStats(),
          window.electronAPI.orders.getAll(),
        ]);
        setStats(statsData);
        // Show the 5 most recent orders
        setOrders((ordersData || []).slice(0, 5));
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
        setError('Failed to load dashboard data. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

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
                <div className="w-6 h-6 bg-slate-200 rounded" />
                <div className="w-20 h-3 bg-slate-200 rounded" />
              </div>
              <div className="mt-4">
                <div className="w-16 h-8 bg-slate-200 rounded" />
                <div className="w-24 h-3 bg-slate-200 rounded mt-2" />
              </div>
            </div>
          ))}
        </section>
        {/* Table skeleton */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-4 space-y-4">
            <div className="h-6 w-40 bg-slate-200 rounded animate-pulse" />
            <div className="h-32 bg-surface-container-lowest rounded-lg animate-pulse" />
            <div className="h-32 bg-surface-container-lowest rounded-lg animate-pulse" />
          </div>
          <div className="lg:col-span-8">
            <div className="h-6 w-40 bg-slate-200 rounded mb-8 animate-pulse" />
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
        <div className="bg-surface-container-lowest p-6 rounded-xl border-b-2 border-primary/20 flex flex-col justify-between h-40 bg-gradient-to-br from-white to-slate-50">
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
      </section>

      {/* Alerts & Latest Orders */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Alerts Section */}
        <div className="lg:col-span-4 space-y-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xl font-headline font-bold text-slate-800">
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
                  : 'bg-surface-container-low border-slate-300'
              }`}
            >
              <span
                className={`material-symbols-outlined ${
                  safeStats.overdue > 0 ? 'text-error' : 'text-slate-400'
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
                  : 'bg-surface-container-low border-slate-300'
              }`}
            >
              <span
                className={`material-symbols-outlined ${
                  safeStats.ready > 0 ? 'text-tertiary' : 'text-slate-400'
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
              <h4 className="font-headline font-bold text-slate-800">
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
            <h3 className="text-xl font-headline font-bold text-slate-800">
              Latest Orders
            </h3>
          </div>

          {orders.length === 0 ? (
            <div className="bg-surface-container-lowest rounded-xl p-12 flex flex-col items-center justify-center text-center space-y-3">
              <span className="material-symbols-outlined text-5xl text-slate-300">
                inbox
              </span>
              <h4 className="font-headline font-bold text-slate-400">
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
