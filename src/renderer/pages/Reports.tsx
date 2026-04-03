import React, { useEffect, useState } from 'react';
import { useTranslation } from '../contexts/I18nContext';

interface ReportStats {
  totalOrders: number;
  revenue: number;
  workersCost: number;
  netProfit: number;
}

interface PaymentSplit {
  card: number;
  cash: number;
  cardAmount: number;
  cashAmount: number;
}

interface MonthlyRevenue {
  month: string;
  value: number;
}

interface RecentOrder {
  id: number;
  order_number: string;
  customer_name?: string;
  piece_type: string;
  status: string;
  delivery_date?: string;
  price: number;
}

function getInitials(name?: string): string {
  if (!name) return '--';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return parts[0].substring(0, 2).toUpperCase();
}

type TimePeriod = 'daily' | 'weekly' | 'monthly';

export default function ReportsPage() {
  const { t, currency } = useTranslation();

  function formatCurrency(amount: number): string {
    return `${t(currency)} ${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }
  const [period, setPeriod] = useState<TimePeriod>('weekly');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [stats, setStats] = useState<ReportStats | null>(null);
  const [paymentSplit, setPaymentSplit] = useState<PaymentSplit | null>(null);
  const [monthlyTrends, setMonthlyTrends] = useState<MonthlyRevenue[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);

  const session = React.useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('session') || '{}');
    } catch {
      return {};
    }
  }, []);

  const branchId = session.branch_id || undefined;

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [statsData, paymentData, monthlyData, ordersData] = await Promise.all([
          window.electronAPI.reports.getStats(branchId, period),
          window.electronAPI.reports.getPaymentSplit(branchId, period),
          window.electronAPI.reports.getMonthlyRevenue(6, branchId),
          window.electronAPI.reports.getRecentOrders(10, branchId, period),
        ]);
        setStats(statsData);
        setPaymentSplit(paymentData);
        setMonthlyTrends(monthlyData || []);
        setRecentOrders(ordersData || []);
      } catch (err: unknown) {
        console.error('Failed to load report data:', err);
        const message = err instanceof Error ? err.message : 'Failed to load report data.';
        setError(message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [branchId, period]);

  if (loading) {
    return (
      <div className="pb-12">
        <header className="flex flex-wrap justify-between items-end gap-4 mb-16">
          <div>
            <h2 className="text-5xl font-headline font-extrabold text-on-surface tracking-tight mb-2">
              {t('Performance Reports')}
            </h2>
            <p className="text-secondary text-lg">
              {t('Detailed analytical overview of your bespoke atelier operations.')}
            </p>
          </div>
        </header>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 xl:gap-8 mb-16">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-surface-container-lowest p-6 rounded-xl h-40 animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
          <div className="lg:col-span-1 bg-surface-container-low p-8 rounded-2xl h-80 animate-pulse" />
          <div className="lg:col-span-2 bg-surface-container-lowest p-8 rounded-2xl h-80 animate-pulse" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <span className="material-symbols-outlined text-5xl text-error">error</span>
        <p className="text-on-surface-variant text-sm">{error}</p>
        <button onClick={() => window.location.reload()} className="btn-primary text-sm">
          {t('Retry')}
        </button>
      </div>
    );
  }

  const safeStats = stats || { totalOrders: 0, revenue: 0, workersCost: 0, netProfit: 0 };
  const safePayment = paymentSplit || { card: 0, cash: 0, cardAmount: 0, cashAmount: 0 };

  const METRICS = [
    {
      labelKey: 'Total Orders',
      value: safeStats.totalOrders.toLocaleString(),
      icon: 'shopping_cart',
      iconBg: 'bg-primary-fixed',
      iconColor: 'text-primary-container',
    },
    {
      labelKey: 'Revenue',
      value: formatCurrency(safeStats.revenue),
      icon: 'payments',
      iconBg: 'bg-secondary-container',
      iconColor: 'text-secondary',
    },
    {
      labelKey: 'Workers Cost',
      value: formatCurrency(safeStats.workersCost),
      icon: 'engineering',
      iconBg: 'bg-tertiary-container',
      iconColor: 'text-on-tertiary-container',
    },
    {
      labelKey: 'Net Profit',
      value: formatCurrency(safeStats.netProfit),
      icon: 'account_balance_wallet',
      iconBg: 'bg-primary-fixed',
      iconColor: 'text-on-primary-fixed',
      highlight: true,
    },
  ];

  // Filter recent orders by search query
  const filteredOrders = searchQuery
    ? recentOrders.filter(
        (o) =>
          o.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (o.customer_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          o.piece_type.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : recentOrders;

  return (
    <div className="pb-12">
      {/* Header & Filters */}
      <header className="flex flex-wrap justify-between items-end gap-4 mb-16">
        <div>
          <h2 className="text-5xl font-headline font-extrabold text-on-surface tracking-tight mb-2">
            {t('Performance Reports')}
          </h2>
          <p className="text-secondary text-lg">
            {t('Detailed analytical overview of your bespoke atelier operations.')}
          </p>
        </div>

        {/* Period Toggle */}
        <div className="inline-flex bg-surface-container-low p-1.5 rounded-xl">
          {(['daily', 'weekly', 'monthly'] as TimePeriod[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 md:px-8 py-3 rounded-lg font-headline text-sm font-bold transition-all capitalize ${
                period === p
                  ? 'bg-surface-container-lowest text-primary shadow-sm'
                  : 'text-secondary hover:text-on-surface'
              }`}
            >
              {t(`${p}`)}
            </button>
          ))}
        </div>
      </header>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 xl:gap-8 mb-16">
        {METRICS.map((m) =>
          m.highlight ? (
            // Highlighted card (Net Profit)
            <div
              key={m.labelKey}
              className="bg-primary text-white p-6 rounded-xl flex flex-col justify-between shadow-lg hover:translate-y-[-4px] transition-all duration-300 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <span className="material-symbols-outlined text-[8rem]">trending_up</span>
              </div>
              <div className="flex justify-between items-start mb-6 z-10">
                <div className={`w-12 h-12 flex items-center justify-center rounded-full ${m.iconBg} ${m.iconColor}`}>
                  <span className="material-symbols-outlined">
                    {m.icon}
                  </span>
                </div>
              </div>
              <div className="z-10">
                <p className="text-primary-fixed text-xs uppercase tracking-widest mb-1">{t(m.labelKey)}</p>
                <p className="text-3xl 2xl:text-4xl font-headline font-bold whitespace-nowrap tracking-tight">{m.value}</p>
              </div>
            </div>
          ) : (
            // Standard metric card
            <div
              key={m.labelKey}
              className="bg-surface-container-lowest p-6 rounded-xl flex flex-col justify-between group hover:translate-y-[-4px] transition-all duration-300"
            >
              <div className="flex justify-between items-start mb-6">
                <div className={`w-12 h-12 flex items-center justify-center rounded-full ${m.iconBg} ${m.iconColor}`}>
                  <span className="material-symbols-outlined">
                    {m.icon}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-secondary text-xs uppercase tracking-widest mb-1">{t(m.labelKey)}</p>
                <p className="text-3xl 2xl:text-4xl font-headline font-bold text-on-surface whitespace-nowrap tracking-tight">{m.value}</p>
              </div>
            </div>
          ),
        )}
      </div>

      {/* Middle Section: Payment Methods & Monthly Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
        {/* Payment Methods Card */}
        <div className="lg:col-span-1 bg-surface-container-low p-8 rounded-2xl">
          <h3 className="font-headline font-bold text-xl mb-8">{t('Payment Methods')}</h3>

          {safePayment.cardAmount === 0 && safePayment.cashAmount === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-secondary">
              <span className="material-symbols-outlined text-5xl mb-3">payments</span>
              <p className="text-sm">{t('No payment data yet')}</p>
            </div>
          ) : (
            <>
              {/* Simple CSS doughnut representation */}
              <div className="relative h-64 flex items-center justify-center">
                <div
                  className="w-48 h-48 rounded-full border-[24px] border-secondary-container relative flex items-center justify-center"
                  style={{ borderRightColor: '#763952', borderBottomColor: '#763952' }}
                >
                  <div className="text-center">
                    <p className="text-3xl font-bold font-headline">{safePayment.card}%</p>
                    <p className="text-[10px] uppercase font-bold text-secondary">{t('Card Share')}</p>
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div className="mt-8 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-primary" />
                    <span className="text-sm font-medium">{t('Card Payments')}</span>
                  </div>
                  <span className="text-sm font-bold">{formatCurrency(safePayment.cardAmount)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-secondary-container" />
                    <span className="text-sm font-medium">{t('Cash Payments')}</span>
                  </div>
                  <span className="text-sm font-bold">{formatCurrency(safePayment.cashAmount)}</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Monthly Trends (simple bar chart) */}
        <div className="lg:col-span-2 bg-surface-container-lowest p-8 rounded-2xl">
          <div className="flex justify-between items-center mb-8">
            <h3 className="font-headline font-bold text-xl">{t('Monthly Revenue Trend')}</h3>
            <span className="text-xs font-bold text-tertiary bg-tertiary-fixed px-3 py-1 rounded-full uppercase">
              {t('Last 6 Months')}
            </span>
          </div>

          {monthlyTrends.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-56 text-secondary">
              <span className="material-symbols-outlined text-5xl mb-3">bar_chart</span>
              <p className="text-sm">{t('No revenue data yet')}</p>
            </div>
          ) : (
            <div className="flex items-end justify-between gap-4 h-56 px-4">
              {monthlyTrends.map((item) => {
                const maxVal = Math.max(...monthlyTrends.map((m) => m.value));
                const heightPct = maxVal > 0 ? (item.value / maxVal) * 100 : 0;
                return (
                  <div key={item.month} className="flex flex-col items-center flex-1 gap-2">
                    <span className="text-xs font-bold text-on-surface">
                      {item.value >= 1000 ? `${(item.value / 1000).toFixed(1)}k` : item.value}
                    </span>
                    <div className="w-full bg-surface-container rounded-lg relative overflow-hidden" style={{ height: '100%' }}>
                      <div
                        className="absolute bottom-0 w-full bg-gradient-to-t from-primary to-primary-container rounded-lg transition-all duration-500"
                        style={{ height: `${heightPct}%` }}
                      />
                    </div>
                    <span className="text-xs text-secondary font-semibold">{item.month}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Orders Summary Table */}
      <section className="bg-surface-container-lowest rounded-2xl overflow-hidden">
        <div className="p-8 border-b border-surface-container flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h3 className="font-headline font-bold text-2xl">{t('Orders summary')}</h3>
          <div className="flex gap-4">
            {/* Search */}
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-sm">
                search
              </span>
              <input
                className="pl-10 pr-4 py-2 bg-surface-container-low border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20 w-64"
                placeholder={t('Search orders...')}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {/* Filter */}
            <button className="flex items-center gap-2 px-4 py-2 bg-surface-container-low rounded-lg text-sm font-bold text-secondary hover:text-on-surface transition-colors">
              <span className="material-symbols-outlined text-sm">filter_list</span>
              {t('Filter')}
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('Order ID')}</th>
                <th>{t('Customer')}</th>
                <th>{t('Service Type')}</th>
                <th>{t('Status')}</th>
                <th className="text-right">{t('Value')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-secondary">
                    <span className="material-symbols-outlined text-5xl mb-3 block">inbox</span>
                    {searchQuery ? t('No matching orders found.') : t('No orders yet.')}
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const statusClass =
                    order.status === 'ready'
                      ? 'chip-ready'
                      : order.status === 'delivered'
                        ? 'chip-delivered'
                        : ['intake', 'cutting', 'sewing'].includes(order.status)
                          ? 'chip-progress'
                          : 'chip-late';
                  const statusLabel =
                    order.status === 'ready' ? t('Ready') :
                    order.status === 'delivered' ? t('Delivered') :
                    t('In Progress');
                  return (
                    <tr key={order.id}>
                      <td className="font-headline font-bold text-sm text-primary">{order.order_number}</td>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-secondary-fixed flex items-center justify-center text-[10px] font-bold text-secondary">
                            {getInitials(order.customer_name)}
                          </div>
                          <span className="font-semibold text-sm">{order.customer_name || t('Unknown')}</span>
                        </div>
                      </td>
                      <td className="text-sm">{order.piece_type}</td>
                      <td>
                        <span className={`chip ${statusClass}`}>{statusLabel}</span>
                      </td>
                      <td className="text-right font-headline font-bold text-sm">{formatCurrency(order.price)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-6 bg-surface border-t border-surface-container flex justify-center">
          <button className="text-primary font-headline font-bold text-xs uppercase tracking-widest hover:underline">
            {t('View All Historical Orders')}
          </button>
        </div>
      </section>
    </div>
  );
}
