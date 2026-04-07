import React, { useEffect, useState, useCallback, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { format, isPast, parseISO } from 'date-fns';
import { useTranslation } from '../contexts/I18nContext';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface Order {
  id: number;
  order_number: string;
  branch_id: number;
  customer_id: number;
  piece_type: string;
  details?: string;
  price: number;
  paid: number;
  balance: number;
  payment_method: 'cash' | 'card';
  status: string;
  receive_date?: string;
  delivery_date?: string;
  created_by?: number;
  created_at?: string;
  customer_name?: string;
  customer_phone?: string;
}

interface OrderStats {
  total: number;
  in_progress: number;
  ready: number;
  delivered: number;
  overdue: number;
  revenue: number;
}

/* ------------------------------------------------------------------ */
/*  Status helpers                                                     */
/* ------------------------------------------------------------------ */
type FilterTab = 'all' | 'in_progress' | 'ready' | 'delivered' | 'late' | 'ready_unpaid';

const DB_STATUSES_FOR_PROGRESS = ['intake', 'cutting', 'sewing'];

/* Display status returns a translation key suffix; the actual label comes from t() */
function displayStatusKey(order: Order): string {
  if (order.status === 'delivered') return 'delivered';
  if (order.status === 'ready') return 'ready';
  if (order.delivery_date && isPast(parseISO(order.delivery_date))) return 'late';
  return 'inProgress';
}

const STATUS_DISPLAY_LABELS: Record<string, string> = {
  inProgress: 'In Progress',
  ready: 'Ready',
  delivered: 'Delivered',
  late: 'Late',
};

function statusChipClass(statusKey: string): string {
  switch (statusKey) {
    case 'inProgress':
      return 'chip chip-progress';
    case 'ready':
      return 'chip chip-ready';
    case 'delivered':
      return 'chip chip-delivered';
    case 'late':
      return 'chip chip-late';
    default:
      return 'chip';
  }
}

/* ------------------------------------------------------------------ */
/*  Piece-type display (name_en stored, show as-is or lookup)          */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Status Update Dropdown (per-row)                                   */
/* ------------------------------------------------------------------ */
const NEXT_STATUS: Record<string, string[]> = {
  In_Progress: ['ready'],
  Ready: ['delivered'],
  Delivered: [],
  Late: ['ready'],
};

function StatusDropdown({
  current,
  orderId,
  orderBalance,
  onUpdated,
  t,
}: {
  current: string;
  orderId: number;
  orderBalance: number;
  onUpdated: () => void;
  t: (key: string, params?: any) => string;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const key = current === 'inProgress' ? 'In_Progress'
    : current === 'ready' ? 'Ready'
    : current === 'delivered' ? 'Delivered'
    : current === 'late' ? 'Late'
    : current;
  const next = NEXT_STATUS[key] || [];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useLayoutEffect(() => {
    if (open && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.left });
    } else {
      setPos(null);
    }
  }, [open]);

  async function handleSelect(dbStatus: string) {
    if (dbStatus === 'delivered' && orderBalance > 0.01) {
      setError(t('Cannot deliver: balance of {balance} QAR outstanding').replace('{balance}', orderBalance.toFixed(2)).replaceAll('QAR', t(currency)));
      setTimeout(() => setError(null), 4000);
      return;
    }
    try {
      await window.electronAPI.orders.updateStatus(orderId, dbStatus);
      setOpen(false);
      onUpdated();
    } catch (err: any) {
      setError(err?.message || t('Failed to update status'));
      setTimeout(() => setError(null), 4000);
    }
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`${statusChipClass(current)} cursor-pointer`}
      >
        {t(STATUS_DISPLAY_LABELS[current] || current)}
        <span className="material-symbols-outlined text-xs ml-1 align-middle">expand_more</span>
      </button>
      {error && pos && createPortal(
        <div className="fixed z-[9999] bg-error text-on-primary text-xs px-3 py-2 rounded-lg shadow-lg whitespace-nowrap"
          style={{ top: pos.top, left: pos.left }}>
          {error}
        </div>,
        document.body,
      )}
      {open && next.length > 0 && pos && createPortal(
        <div className="fixed z-[9999] bg-surface-container-lowest rounded-lg shadow-lg border border-outline-variant/30 py-1 min-w-[140px]"
          style={{ top: pos.top, left: pos.left }}>
          {next.map((s) => {
            const targetStatus = s === 'ready' ? 'ready' : 'delivered';
            const isBlocked = targetStatus === 'delivered' && orderBalance > 0.01;
            return (
              <button
                key={s}
                onClick={() => handleSelect(targetStatus)}
                disabled={isBlocked}
                className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                  isBlocked
                    ? 'text-outline cursor-not-allowed'
                    : 'hover:bg-surface-container-high'
                }`}
                title={isBlocked ? t('Order must be fully paid before delivery') : undefined}
              >
                {t('Mark as')} {t(STATUS_DISPLAY_LABELS[targetStatus] || targetStatus)}
                {isBlocked && <span className="ml-1 text-error text-xs">({t('Unpaid')})</span>}
              </button>
            );
          })}
        </div>,
        document.body,
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function OrdersPage() {
  const navigate = useNavigate();
  const { t, currency } = useTranslation();
  const session = JSON.parse(localStorage.getItem('session') || '{}');
  const isWorker = session.role === 'worker';
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [orderItemsMap, setOrderItemsMap] = React.useState<Record<number, any[]>>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [allOrders, orderStats] = await Promise.all([
        window.electronAPI.orders.getAll(),
        window.electronAPI.orders.getStats(),
      ]);
      setOrders(allOrders);
      setStats(orderStats);

      // Fetch items for each order
      const itemsMap: Record<number, any[]> = {};
      await Promise.all(
        allOrders.map(async (order: any) => {
          try {
            const items = await window.electronAPI.orders.getItems(order.id);
            if (items && items.length > 0) {
              itemsMap[order.id] = items;
            }
          } catch { /* ignore per-order errors */ }
        })
      );
      setOrderItemsMap(itemsMap);
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* Search with debounce */
  const handleSearch = useCallback(
    (q: string) => {
      setSearchQuery(q);
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
      if (!q.trim()) {
        fetchData();
        return;
      }
      searchTimeout.current = setTimeout(async () => {
        try {
          const results = await window.electronAPI.orders.search(q);
          setOrders(results);

          // Fetch items for search results
          const itemsMap: Record<number, any[]> = {};
          await Promise.all(
            results.map(async (order: any) => {
              try {
                const items = await window.electronAPI.orders.getItems(order.id);
                if (items && items.length > 0) {
                  itemsMap[order.id] = items;
                }
              } catch { /* ignore */ }
            })
          );
          setOrderItemsMap(itemsMap);
        } catch (err) {
          console.error('Search failed:', err);
        }
      }, 300);
    },
    [fetchData],
  );

  /* Filter by tab */
  const filteredOrders = orders.filter((o) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'ready_unpaid') return o.status === 'ready' && (o.price - o.paid) > 0.01;
    const statusKey = displayStatusKey(o);
    if (activeFilter === 'in_progress') return DB_STATUSES_FOR_PROGRESS.includes(o.status);
    if (activeFilter === 'late') return statusKey === 'late';
    return statusKey === activeFilter;
  });

  /* Count ready & unpaid */
  const readyUnpaidCount = orders.filter((o) => o.status === 'ready' && (o.price - o.paid) > 0.01).length;

  /* Stats badges */
  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: 'all', label: t('All'), count: stats?.total ?? 0 },
    { key: 'in_progress', label: t('In Progress'), count: stats?.in_progress ?? 0 },
    { key: 'ready', label: t('Ready'), count: stats?.ready ?? 0 },
    { key: 'ready_unpaid', label: t('Ready & Unpaid'), count: readyUnpaidCount },
    { key: 'delivered', label: t('Delivered'), count: stats?.delivered ?? 0 },
    { key: 'late', label: t('Late'), count: stats?.overdue ?? 0 },
  ];

  /* Helpers */
  function buildItemsSummary(items: any[] | undefined, fallback: string): string {
    if (!items || items.length === 0) return fallback;
    const totalQty = items.reduce((s, it) => s + (it.quantity || 1), 0);
    if (items.length === 1) {
      return `${items[0].piece_type} x${items[0].quantity || 1}`;
    }
    if (totalQty <= 6) {
      return items.map((it) => `${it.piece_type} x${it.quantity || 1}`).join(', ');
    }
    return `${items.length} types, ${totalQty} pieces`;
  }

  function formatCurrency(v: number) {
    return v.toLocaleString('en-US', { minimumFractionDigits: 0 });
  }

  function getInitials(name?: string) {
    if (!name) return '?';
    return name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  return (
    <div className="space-y-8">
      {/* ---- Header ---- */}
      <div className="flex flex-wrap justify-between items-end gap-4">
        <div>
          <h2 className="text-4xl font-bold tracking-tight text-on-surface mb-2 font-headline">
            {t('Orders Registry')}
          </h2>
          <p className="text-secondary text-lg">{t('Manage bespoke commissions and production status.')}</p>
        </div>

        {/* Filters cluster */}
        <div className="flex gap-3 items-center bg-surface-container-low p-2 rounded-xl">
          {/* Search */}
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">
              search
            </span>
            <input
              type="text"
              placeholder={t('Search orders...')}
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="h-10 pl-10 pr-4 bg-surface-container-lowest border-none rounded-lg text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none w-52"
            />
          </div>

          {/* New Order */}
          <button
            onClick={() => navigate('/orders/new')}
            className="btn-primary h-10 px-5 text-sm rounded-lg flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            {t('New Order')}
          </button>
        </div>
      </div>

      {/* ---- Filter Tabs ---- */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveFilter(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeFilter === tab.key
                ? 'bg-primary text-on-primary shadow-sm'
                : tab.key === 'ready_unpaid' && tab.count > 0
                  ? 'bg-error/10 text-error hover:bg-error/20'
                  : 'bg-surface-container-high text-secondary hover:bg-surface-container-highest'
            }`}
          >
            {tab.label}
            <span
              className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                activeFilter === tab.key
                  ? 'bg-on-primary/20 text-on-primary'
                  : 'bg-surface-container-highest text-outline'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* ---- Table ---- */}
      <div className="bg-surface-container-lowest rounded-2xl shadow-[0px_20px_40px_rgba(25,28,29,0.06)] overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-secondary">
            <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>
            {t('Loading orders...')}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-secondary">
            <span className="material-symbols-outlined text-4xl mb-3 text-outline">shopping_bag</span>
            <p className="font-semibold text-on-surface mb-1">{t('No orders found')}</p>
            <p className="text-sm">{t('Try adjusting your filters or create a new order.')}</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('Order ID')}</th>
                <th>{t('Customer')}</th>
                <th>{t('Item Type')}</th>
                {!isWorker && <th className="text-right">{t('Price')}</th>}
                {!isWorker && <th className="text-right">{t('Paid')}</th>}
                {!isWorker && <th className="text-right">{t('Balance')}</th>}
                <th>{t('Status')}</th>
                <th>{t('Delivery')}</th>
                <th className="text-center">{t('Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => {
                const dStatus = displayStatusKey(order);
                const balance = order.price - order.paid;

                return (
                  <tr key={order.id} className="group">
                    {/* Order ID */}
                    <td>
                      <button
                        onClick={() => navigate(`/orders/${order.id}`)}
                        className="font-bold text-primary hover:underline cursor-pointer"
                      >
                        {order.order_number}
                      </button>
                    </td>

                    {/* Customer */}
                    <td>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-primary-fixed text-on-primary-fixed text-xs font-bold flex items-center justify-center shrink-0">
                          {getInitials(order.customer_name)}
                        </div>
                        <span className="font-medium truncate">{order.customer_name || t('Unknown')}</span>
                      </div>
                    </td>

                    {/* Item Type */}
                    <td className="text-secondary">
                      {buildItemsSummary(orderItemsMap[order.id], order.piece_type)}
                    </td>

                    {/* Price */}
                    {!isWorker && <td className="text-right font-medium">{formatCurrency(order.price)}</td>}

                    {/* Paid */}
                    {!isWorker && <td className="text-right text-secondary">{formatCurrency(order.paid)}</td>}

                    {/* Balance */}
                    {!isWorker && <td className={`text-right font-bold ${balance > 0.01 ? 'text-error' : 'text-tertiary'}`}>
                      {formatCurrency(balance)}
                    </td>}

                    {/* Status */}
                    <td>
                      <StatusDropdown
                        current={dStatus}
                        orderId={order.id}
                        orderBalance={balance}
                        onUpdated={fetchData}
                        t={t}
                      />
                    </td>

                    {/* Delivery */}
                    <td className="text-secondary text-sm">
                      {order.delivery_date
                        ? format(parseISO(order.delivery_date), 'MMM dd, yyyy')
                        : '--'}
                    </td>

                    {/* Actions */}
                    <td>
                      <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => navigate(`/orders/${order.id}`)}
                          className="p-1.5 hover:bg-surface-container-high rounded-md text-secondary"
                          title={t('Edit')}
                        >
                          <span className="material-symbols-outlined text-lg">edit_square</span>
                        </button>
                        <button
                          onClick={() => navigate(`/invoice/${order.id}`)}
                          className="p-1.5 hover:bg-surface-container-high rounded-md text-secondary"
                          title={t('View Invoice')}
                        >
                          <span className="material-symbols-outlined text-lg">visibility</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ---- Footer info ---- */}
      {!loading && filteredOrders.length > 0 && (
        <div className="flex justify-between items-center text-secondary text-sm px-2">
          <div>
            {t('Showing {count} of {total} orders')}{' '}
            <span className="font-bold text-on-surface">{filteredOrders.length}</span> {t('of')}{' '}
            <span className="font-bold text-on-surface">{stats?.total ?? 0}</span> {t('order(s)')}
          </div>
          <div className="flex gap-2">
            {!isWorker && (
              <span className="text-xs text-outline">
                {t('Revenue (open):')}{' '}
                <span className="font-bold text-on-surface">
                  {(stats?.revenue ?? 0).toLocaleString('en-US')} {t(currency)}
                </span>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
