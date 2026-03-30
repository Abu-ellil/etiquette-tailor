import React, { useState } from 'react';

// --- Mock data ---
const METRICS = [
  {
    label: 'Total Orders',
    value: '184',
    change: '+12%',
    changeType: 'positive' as const,
    icon: 'shopping_cart',
    iconBg: 'bg-primary-fixed',
    iconColor: 'text-primary-container',
  },
  {
    label: 'Revenue',
    value: 'QAR 42,920',
    change: '+8.4%',
    changeType: 'positive' as const,
    icon: 'payments',
    iconBg: 'bg-secondary-container',
    iconColor: 'text-secondary',
  },
  {
    label: 'Workers Cost',
    value: 'QAR 11,450',
    change: '-2.1%',
    changeType: 'negative' as const,
    icon: 'engineering',
    iconBg: 'bg-tertiary-container',
    iconColor: 'text-on-tertiary-container',
  },
  {
    label: 'Net Profit',
    value: 'QAR 31,470',
    change: '+14.2%',
    changeType: 'positive' as const,
    icon: 'account_balance_wallet',
    iconBg: 'bg-primary-fixed',
    iconColor: 'text-on-primary-fixed',
    highlight: true,
  },
];

const PAYMENT_SPLIT = { card: 72, cash: 28, cardAmount: 'QAR 30,902', cashAmount: 'QAR 12,018' };

const MONTHLY_TRENDS = [
  { month: 'Jul', value: 45 },
  { month: 'Aug', value: 62 },
  { month: 'Sep', value: 38 },
  { month: 'Oct', value: 78 },
  { month: 'Nov', value: 55 },
  { month: 'Dec', value: 91 },
];

const RECENT_ORDERS = [
  { id: '#A-0094', customer: 'Fatima Al-Rashid', initials: 'FR', type: 'Bespoke Abaya', status: 'Ready', value: 'QAR 1,250.00' },
  { id: '#B-0073', customer: 'Noura Khalid', initials: 'NK', type: 'Evening Dress Alteration', status: 'In Progress', value: 'QAR 450.00' },
  { id: '#A-0092', customer: 'Mariam Hassan', initials: 'MH', type: 'Cashmere Overcoat', status: 'Late', value: 'QAR 2,100.00' },
  { id: '#B-0071', customer: 'Sara Al-Maktoum', initials: 'SM', type: '3x Silk Hijabs', status: 'Ready', value: 'QAR 820.00' },
];

type TimePeriod = 'daily' | 'weekly' | 'monthly';

export default function ReportsPage() {
  const [period, setPeriod] = useState<TimePeriod>('weekly');
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="pb-12">
      {/* Header & Filters */}
      <header className="flex flex-wrap justify-between items-end gap-4 mb-16">
        <div>
          <h2 className="text-5xl font-headline font-extrabold text-on-surface tracking-tight mb-2">
            Performance Reports
          </h2>
          <p className="text-secondary text-lg">
            Detailed analytical overview of your bespoke atelier operations.
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
              {p}
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
              key={m.label}
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
                <span className="text-xs font-bold bg-surface-container-lowest/20 px-3 py-1 rounded-full backdrop-blur-md">
                  {m.change}
                </span>
              </div>
              <div className="z-10">
                <p className="text-primary-fixed text-xs uppercase tracking-widest mb-1">{m.label}</p>
                <p className="text-3xl 2xl:text-4xl font-headline font-bold whitespace-nowrap tracking-tight">{m.value}</p>
              </div>
            </div>
          ) : (
            // Standard metric card
            <div
              key={m.label}
              className="bg-surface-container-lowest p-6 rounded-xl flex flex-col justify-between group hover:translate-y-[-4px] transition-all duration-300"
            >
              <div className="flex justify-between items-start mb-6">
                <div className={`w-12 h-12 flex items-center justify-center rounded-full ${m.iconBg} ${m.iconColor}`}>
                  <span className="material-symbols-outlined">
                    {m.icon}
                  </span>
                </div>
                <span
                  className={`text-xs font-bold px-3 py-1 rounded-full ${
                    m.changeType === 'positive'
                      ? 'text-tertiary bg-tertiary-fixed'
                      : 'text-on-error-container bg-error-container'
                  }`}
                >
                  {m.change}
                </span>
              </div>
              <div>
                <p className="text-secondary text-xs uppercase tracking-widest mb-1">{m.label}</p>
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
          <h3 className="font-headline font-bold text-xl mb-8">Payment Methods</h3>

          {/* Simple CSS doughnut representation */}
          <div className="relative h-64 flex items-center justify-center">
            <div
              className="w-48 h-48 rounded-full border-[24px] border-secondary-container relative flex items-center justify-center"
              style={{ borderRightColor: '#763952', borderBottomColor: '#763952' }}
            >
              <div className="text-center">
                <p className="text-3xl font-bold font-headline">{PAYMENT_SPLIT.card}%</p>
                <p className="text-[10px] uppercase font-bold text-secondary">Card Share</p>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="mt-8 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary" />
                <span className="text-sm font-medium">Card Payments</span>
              </div>
              <span className="text-sm font-bold">{PAYMENT_SPLIT.cardAmount}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-secondary-container" />
                <span className="text-sm font-medium">Cash Payments</span>
              </div>
              <span className="text-sm font-bold">{PAYMENT_SPLIT.cashAmount}</span>
            </div>
          </div>
        </div>

        {/* Monthly Trends (simple bar chart) */}
        <div className="lg:col-span-2 bg-surface-container-lowest p-8 rounded-2xl">
          <div className="flex justify-between items-center mb-8">
            <h3 className="font-headline font-bold text-xl">Monthly Revenue Trend</h3>
            <span className="text-xs font-bold text-tertiary bg-tertiary-fixed px-3 py-1 rounded-full uppercase">
              Last 6 Months
            </span>
          </div>

          {/* Visual bar chart using styled divs */}
          <div className="flex items-end justify-between gap-4 h-56 px-4">
            {MONTHLY_TRENDS.map((t) => {
              const maxVal = Math.max(...MONTHLY_TRENDS.map((m) => m.value));
              const heightPct = (t.value / maxVal) * 100;
              return (
                <div key={t.month} className="flex flex-col items-center flex-1 gap-2">
                  <span className="text-xs font-bold text-on-surface">{t.value}k</span>
                  <div className="w-full bg-surface-container rounded-lg relative overflow-hidden" style={{ height: '100%' }}>
                    <div
                      className="absolute bottom-0 w-full bg-gradient-to-t from-primary to-primary-container rounded-lg transition-all duration-500"
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                  <span className="text-xs text-secondary font-semibold">{t.month}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Orders Summary Table */}
      <section className="bg-surface-container-lowest rounded-2xl overflow-hidden">
        <div className="p-8 border-b border-surface-container flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h3 className="font-headline font-bold text-2xl">Orders Summary</h3>
          <div className="flex gap-4">
            {/* Search */}
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-sm">
                search
              </span>
              <input
                className="pl-10 pr-4 py-2 bg-surface-container-low border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20 w-64"
                placeholder="Search orders..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {/* Filter */}
            <button className="flex items-center gap-2 px-4 py-2 bg-surface-container-low rounded-lg text-sm font-bold text-secondary hover:text-on-surface transition-colors">
              <span className="material-symbols-outlined text-sm">filter_list</span>
              Filter
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Service Type</th>
                <th>Status</th>
                <th className="text-right">Value</th>
              </tr>
            </thead>
            <tbody>
              {RECENT_ORDERS.map((order) => {
                const statusClass =
                  order.status === 'Ready'
                    ? 'chip-ready'
                    : order.status === 'In Progress'
                      ? 'chip-progress'
                      : 'chip-late';
                return (
                  <tr key={order.id}>
                    <td className="font-headline font-bold text-sm text-primary">{order.id}</td>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-secondary-fixed flex items-center justify-center text-[10px] font-bold text-secondary">
                          {order.initials}
                        </div>
                        <span className="font-semibold text-sm">{order.customer}</span>
                      </div>
                    </td>
                    <td className="text-sm">{order.type}</td>
                    <td>
                      <span className={`chip ${statusClass}`}>{order.status}</span>
                    </td>
                    <td className="text-right font-headline font-bold text-sm">{order.value}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-6 bg-surface border-t border-surface-container flex justify-center">
          <button className="text-primary font-headline font-bold text-xs uppercase tracking-widest hover:underline">
            View All Historical Orders
          </button>
        </div>
      </section>
    </div>
  );
}
