import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { format, isPast, parseISO } from 'date-fns';

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
type FilterTab = 'all' | 'in_progress' | 'ready' | 'delivered' | 'late';

const STATUS_MAP: Record<string, string> = {
  intake: 'In Progress',
  cutting: 'In Progress',
  sewing: 'In Progress',
  ready: 'Ready',
  delivered: 'Delivered',
};

const DB_STATUSES_FOR_PROGRESS = ['intake', 'cutting', 'sewing'];

function displayStatus(order: Order): string {
  if (order.status === 'delivered') return 'Delivered';
  if (order.status === 'ready') return 'Ready';
  if (order.delivery_date && isPast(parseISO(order.delivery_date))) return 'Late';
  return 'In Progress';
}

function statusChipClass(status: string): string {
  switch (status) {
    case 'In Progress':
      return 'chip chip-progress';
    case 'Ready':
      return 'chip chip-ready';
    case 'Delivered':
      return 'chip chip-delivered';
    case 'Late':
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
  onUpdated,
}: {
  current: string;
  orderId: number;
  onUpdated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const key = current.replace(/ /g, '_');
  const next = NEXT_STATUS[key] || [];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function handleSelect(dbStatus: string) {
    await window.electronAPI.orders.updateStatus(orderId, dbStatus);
    setOpen(false);
    onUpdated();
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`${statusChipClass(current)} cursor-pointer`}
      >
        {current}
        <span className="material-symbols-outlined text-xs ml-1 align-middle">expand_more</span>
      </button>
      {open && next.length > 0 && (
        <div className="absolute z-50 mt-1 left-0 bg-white rounded-lg shadow-lg border border-outline-variant/30 py-1 min-w-[140px]">
          {next.map((s) => (
            <button
              key={s}
              onClick={() => handleSelect(s === 'ready' ? 'ready' : 'delivered')}
              className="w-full text-left px-4 py-2 text-sm hover:bg-surface-container-high transition-colors"
            >
              Mark as {s.replace('_', ' ')}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function OrdersPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [allOrders, orderStats] = await Promise.all([
        window.electronAPI.orders.getAll(),
        window.electronAPI.orders.getStats(),
      ]);
      setOrders(allOrders);
      setStats(orderStats);
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
    const display = displayStatus(o).toLowerCase().replace(' ', '_');
    if (activeFilter === 'in_progress') return DB_STATUSES_FOR_PROGRESS.includes(o.status);
    if (activeFilter === 'late') return display === 'late';
    return display === activeFilter;
  });

  /* Stats badges */
  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: stats?.total ?? 0 },
    { key: 'in_progress', label: 'In Progress', count: stats?.in_progress ?? 0 },
    { key: 'ready', label: 'Ready', count: stats?.ready ?? 0 },
    { key: 'delivered', label: 'Delivered', count: stats?.delivered ?? 0 },
    { key: 'late', label: 'Late', count: stats?.overdue ?? 0 },
  ];

  /* Helpers */
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
            Orders Registry
          </h2>
          <p className="text-secondary text-lg">Manage bespoke commissions and production status.</p>
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
              placeholder="Search orders..."
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
            New Order
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
      <div className="bg-surface-container-lowest rounded-2xl overflow-hidden shadow-[0px_20px_40px_rgba(25,28,29,0.06)] overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-secondary">
            <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>
            Loading orders...
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-secondary">
            <span className="material-symbols-outlined text-4xl mb-3 text-outline">shopping_bag</span>
            <p className="font-semibold text-on-surface mb-1">No orders found</p>
            <p className="text-sm">Try adjusting your filters or create a new order.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Item Type</th>
                <th className="text-right">Price</th>
                <th className="text-right">Paid</th>
                <th className="text-right">Balance</th>
                <th>Status</th>
                <th>Delivery</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => {
                const dStatus = displayStatus(order);
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
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-fixed text-on-primary-fixed text-xs font-bold flex items-center justify-center shrink-0">
                          {getInitials(order.customer_name)}
                        </div>
                        <span className="font-medium">{order.customer_name || 'Unknown'}</span>
                      </div>
                    </td>

                    {/* Item Type */}
                    <td className="text-secondary">
                      {order.piece_type}
                    </td>

                    {/* Price */}
                    <td className="text-right font-medium">{formatCurrency(order.price)}</td>

                    {/* Paid */}
                    <td className="text-right text-secondary">{formatCurrency(order.paid)}</td>

                    {/* Balance */}
                    <td className={`text-right font-bold ${balance > 0 ? 'text-error' : 'text-tertiary'}`}>
                      {formatCurrency(balance)}
                    </td>

                    {/* Status */}
                    <td>
                      <StatusDropdown
                        current={dStatus}
                        orderId={order.id}
                        onUpdated={fetchData}
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
                          onClick={() => navigate(`/orders/edit/${order.id}`)}
                          className="p-1.5 hover:bg-surface-container-high rounded-md text-secondary"
                          title="Edit"
                        >
                          <span className="material-symbols-outlined text-lg">edit_square</span>
                        </button>
                        <button
                          onClick={() => navigate(`/invoice/${order.id}`)}
                          className="p-1.5 hover:bg-surface-container-high rounded-md text-secondary"
                          title="View Invoice"
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
            Showing{' '}
            <span className="font-bold text-on-surface">{filteredOrders.length}</span> of{' '}
            <span className="font-bold text-on-surface">{stats?.total ?? 0}</span> orders
          </div>
          <div className="flex gap-2">
            <span className="text-xs text-outline">
              Revenue (open):{' '}
              <span className="font-bold text-on-surface">
                {(stats?.revenue ?? 0).toLocaleString('en-US')} QAR
              </span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
