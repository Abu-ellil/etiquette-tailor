import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useTranslation } from '../contexts/I18nContext';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts';

interface WorkerPerformance {
  worker_id: number;
  worker_name: string;
  order_count: number;
  percentage: number;
  revenue: number;
}

interface ReportOrder {
  id: number;
  order_number: string;
  customer_name?: string;
  piece_type: string;
  status: string;
  price: number;
  paid: number;
  created_at?: string;
  delivery_date?: string;
}

interface DailyStat {
  date: string;
  orders: number;
  revenue: number;
}

interface WorkerContribution {
  worker_name: string;
  task_count: number;
  wage_total: number;
}

interface ReportData {
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  completedOrders: number;
  workerPerformance: WorkerPerformance[];
  orders: ReportOrder[];
}

const PIE_COLORS = ['#763952', '#505f76', '#695f00', '#d0e1fb', '#f2e57b', '#ffd9e4', '#ba1a1a', '#92506a'];

type ReportTab = 'summary' | 'daily' | 'period';

export default function AdvancedReportsPage() {
  const { t, currency } = useTranslation();

  const session = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('session') || '{}');
    } catch {
      return {};
    }
  }, []);

  const branchId = session.branch_id || undefined;
  const isAdmin = session.role === 'admin';

  const [tab, setTab] = useState<ReportTab>('summary');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([]);
  const [workerContribution, setWorkerContribution] = useState<WorkerContribution[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);

  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [filterWorker, setFilterWorker] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [emailTo, setEmailTo] = useState('');
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    async function loadWorkers() {
      try {
        const data = await window.electronAPI.workers.getAll();
        setWorkers(data || []);
      } catch { /* ignore */ }
    }
    loadWorkers();
  }, []);

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const filter: any = {};
      if (isAdmin && branchId) filter.branchId = branchId;
      else if (!isAdmin && branchId) filter.branchId = branchId;

      if (tab === 'daily') {
        filter.startDate = new Date().toISOString().split('T')[0];
        filter.endDate = new Date().toISOString().split('T')[0];
      } else {
        if (startDate) filter.startDate = startDate;
        if (endDate) filter.endDate = endDate;
      }

      if (filterWorker) filter.workerId = parseInt(filterWorker);
      if (filterStatus) filter.status = filterStatus;

      const [data, daily, contribution] = await Promise.all([
        window.electronAPI.reports.getAdvanced(filter),
        window.electronAPI.reports.getDailyStats(30, branchId),
        window.electronAPI.reports.getWorkerContribution(branchId, filter.startDate, filter.endDate),
      ]);

      setReportData(data);
      setDailyStats(daily || []);
      setWorkerContribution(contribution || []);
    } catch (err) {
      console.error('Failed to load report:', err);
    } finally {
      setLoading(false);
    }
  }, [tab, startDate, endDate, filterWorker, filterStatus, branchId, isAdmin]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  function formatCurrency(amount: number): string {
    return `${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ${t(currency)}`;
  }

  const statusLabel = (status: string) => {
    const map: Record<string, string> = {
      intake: t('Intake'), cutting: t('Cutting'), sewing: t('Sewing'),
      ready: t('Ready'), delivered: t('Delivered'),
    };
    return map[status] || status;
  };

  const statusChipClass = (status: string) => {
    if (status === 'ready') return 'chip-ready';
    if (status === 'delivered') return 'chip-delivered';
    return 'chip-progress';
  };

  function buildPDFHtml(): string {
    if (!reportData) return '';
    const rows = reportData.orders.map(o => `
      <tr>
        <td style="padding:8px;border:1px solid #ddd">${o.order_number}</td>
        <td style="padding:8px;border:1px solid #ddd">${o.customer_name || '--'}</td>
        <td style="padding:8px;border:1px solid #ddd">${o.piece_type}</td>
        <td style="padding:8px;border:1px solid #ddd">${o.status}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right">${o.price}</td>
      </tr>
    `).join('');
    const workerRows = reportData.workerPerformance.map(w => `
      <tr>
        <td style="padding:8px;border:1px solid #ddd">${w.worker_name}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:center">${w.order_count}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:center">${w.percentage}%</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right">${formatCurrency(w.revenue)}</td>
      </tr>
    `).join('');
    return `<html dir="${document.documentElement.dir}"><head><meta charset="utf-8"><title>Report</title>
    <style>body{font-family:Arial,sans-serif;padding:24px;color:#333}table{width:100%;border-collapse:collapse;margin:16px 0}th{background:#763952;color:#fff;padding:8px;text-align:left;border:1px solid #ddd}h1{color:#763952}.summary{display:flex;gap:16px;margin:16px 0}.card{flex:1;background:#f8f9fa;padding:16px;border-radius:8px}.card h4{margin:0 0 4px;color:#505f76;font-size:12px;text-transform:uppercase}.card p{margin:0;font-size:24px;font-weight:bold;color:#191c1d}</style></head>
    <body>
    <h1>${t('Advanced Report')}</h1>
    <p>${t('Period')}: ${startDate} → ${endDate}</p>
    <div class="summary">
      <div class="card"><h4>${t('Total Orders')}</h4><p>${reportData.totalOrders}</p></div>
      <div class="card"><h4>${t('Revenue')}</h4><p>${formatCurrency(reportData.totalRevenue)}</p></div>
      <div class="card"><h4>${t('Pending')}</h4><p>${reportData.pendingOrders}</p></div>
      <div class="card"><h4>${t('Completed')}</h4><p>${reportData.completedOrders}</p></div>
    </div>
    <h3>${t('Worker Performance')}</h3>
    <table><thead><tr><th>${t('Worker')}</th><th style="text-align:center">${t('Orders')}</th><th style="text-align:center">%</th><th style="text-align:right">${t('Revenue')}</th></tr></thead><tbody>${workerRows}</tbody></table>
    <h3>${t('Orders')}</h3>
    <table><thead><tr><th>${t('Order')}</th><th>${t('Customer')}</th><th>${t('Service')}</th><th>${t('Status')}</th><th style="text-align:right">${t('Value')}</th></tr></thead><tbody>${rows}</tbody></table>
    </body></html>`;
  }

  async function handleExportPDF() {
    const html = buildPDFHtml();
    const filename = `report-${startDate}-${endDate}.html`;
    await window.electronAPI.reports.exportPDF(html, filename);
  }

  async function handleSendEmail() {
    if (!reportData) return;
    const subject = `${t('Report')} ${startDate} - ${endDate}`;
    const body = [
      `${t('Total Orders')}: ${reportData.totalOrders}`,
      `${t('Revenue')}: ${formatCurrency(reportData.totalRevenue)}`,
      `${t('Pending')}: ${reportData.pendingOrders}`,
      `${t('Completed')}: ${reportData.completedOrders}`,
      '',
      t('Worker Performance') + ':',
      ...reportData.workerPerformance.map(w =>
        `  ${w.worker_name}: ${w.order_count} ${t('orders')} (${w.percentage}%)`
      ),
    ].join('\n');
    await window.electronAPI.reports.sendEmail(emailTo, subject, body);
    setEmailSent(true);
    setTimeout(() => { setEmailSent(false); setShowEmailModal(false); }, 2000);
  }

  if (loading && !reportData) {
    return (
      <div className="pb-12">
        <header className="mb-12">
          <div className="h-12 w-96 bg-surface-container-high rounded animate-pulse mb-4" />
          <div className="h-6 w-72 bg-surface-container-high rounded animate-pulse" />
        </header>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-surface-container-lowest p-6 rounded-xl h-32 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const safeData = reportData || { totalOrders: 0, totalRevenue: 0, pendingOrders: 0, completedOrders: 0, workerPerformance: [], orders: [] };

  const METRICS = [
    { label: t('Total Orders'), value: safeData.totalOrders.toLocaleString(), icon: 'shopping_cart', bg: 'bg-primary-fixed', iconColor: 'text-primary-container' },
    { label: t('Revenue'), value: formatCurrency(safeData.totalRevenue), icon: 'payments', bg: 'bg-secondary-container', iconColor: 'text-secondary' },
    { label: t('Pending Orders'), value: safeData.pendingOrders.toLocaleString(), icon: 'schedule', bg: 'bg-tertiary-container', iconColor: 'text-on-tertiary-container' },
    { label: t('Completed'), value: safeData.completedOrders.toLocaleString(), icon: 'check_circle', bg: 'bg-primary-fixed', iconColor: 'text-on-primary-fixed', highlight: true },
  ];

  return (
    <div className="pb-12">
      <header className="flex flex-wrap justify-between items-end gap-4 mb-10">
        <div>
          <h2 className="text-4xl font-headline font-extrabold text-on-surface tracking-tight mb-2">
            {t('Advanced Reports')}
          </h2>
          <p className="text-secondary text-lg">
            {t('Orders summary, worker performance, and period analysis.')}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary rounded-lg font-headline font-bold text-sm hover:opacity-90 transition-opacity"
          >
            <span className="material-symbols-outlined text-base">picture_as_pdf</span>
            {t('Export PDF')}
          </button>
          <button
            onClick={() => setShowEmailModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-surface-container-low text-on-surface rounded-lg font-headline font-bold text-sm border border-outline-variant hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined text-base">mail</span>
            {t('Email')}
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 mb-8">
        {(['summary', 'daily', 'period'] as ReportTab[]).map((tb) => (
          <button
            key={tb}
            onClick={() => setTab(tb)}
            className={`px-6 py-2.5 rounded-lg font-headline font-bold text-sm capitalize transition-all ${
              tab === tb
                ? 'bg-primary text-on-primary shadow-sm'
                : 'bg-surface-container-low text-secondary hover:text-on-surface'
            }`}
          >
            {tb === 'summary' ? t('Orders Summary') : tb === 'daily' ? t('Daily Report') : t('Period Report')}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-surface-container-lowest rounded-xl p-6 mb-8">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[140px]">
            <label className="text-xs font-bold text-secondary uppercase tracking-wider block mb-1.5">{t('From')}</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-surface-container-low border-none rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="text-xs font-bold text-secondary uppercase tracking-wider block mb-1.5">{t('To')}</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-surface-container-low border-none rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="text-xs font-bold text-secondary uppercase tracking-wider block mb-1.5">{t('Worker')}</label>
            <select
              value={filterWorker}
              onChange={(e) => setFilterWorker(e.target.value)}
              className="w-full bg-surface-container-low border-none rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20"
            >
              <option value="">{t('All Workers')}</option>
              {workers.map((w: any) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="text-xs font-bold text-secondary uppercase tracking-wider block mb-1.5">{t('Status')}</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full bg-surface-container-low border-none rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20"
            >
              <option value="">{t('All')}</option>
              <option value="intake">{t('Intake')}</option>
              <option value="cutting">{t('Cutting')}</option>
              <option value="sewing">{t('Sewing')}</option>
              <option value="ready">{t('Ready')}</option>
              <option value="delivered">{t('Delivered')}</option>
            </select>
          </div>
          <button
            onClick={loadReport}
            className="px-6 py-2.5 bg-primary text-on-primary rounded-lg font-headline font-bold text-sm hover:opacity-90 transition-opacity flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-base">refresh</span>
            {t('Refresh')}
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {METRICS.map((m) =>
          m.highlight ? (
            <div key={m.label} className="bg-primary text-white p-6 rounded-xl shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <span className="material-symbols-outlined text-[6rem]">trending_up</span>
              </div>
              <div className="flex justify-between items-start mb-4 z-10 relative">
                <div className={`w-10 h-10 flex items-center justify-center rounded-full ${m.bg} ${m.iconColor}`}>
                  <span className="material-symbols-outlined text-sm">{m.icon}</span>
                </div>
              </div>
              <div className="z-10 relative">
                <p className="text-primary-fixed text-xs uppercase tracking-widest mb-1">{m.label}</p>
                <p className="text-2xl font-headline font-bold whitespace-nowrap">{m.value}</p>
              </div>
            </div>
          ) : (
            <div key={m.label} className="bg-surface-container-lowest p-6 rounded-xl group hover:translate-y-[-2px] transition-all duration-300">
              <div className="flex justify-between items-start mb-4">
                <div className={`w-10 h-10 flex items-center justify-center rounded-full ${m.bg} ${m.iconColor}`}>
                  <span className="material-symbols-outlined text-sm">{m.icon}</span>
                </div>
              </div>
              <p className="text-secondary text-xs uppercase tracking-widest mb-1">{m.label}</p>
              <p className="text-2xl font-headline font-bold text-on-surface whitespace-nowrap">{m.value}</p>
            </div>
          )
        )}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
        {/* Orders Over Time */}
        <div className="lg:col-span-2 bg-surface-container-lowest p-6 rounded-2xl">
          <h3 className="font-headline font-bold text-lg mb-6">{t('Orders Over Time')}</h3>
          {dailyStats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-secondary">
              <span className="material-symbols-outlined text-4xl mb-2">bar_chart</span>
              <p className="text-sm">{t('No data for the selected period.')}</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={dailyStats}>
                <defs>
                  <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#763952" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#763952" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e8e9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#807381" tickFormatter={(v: string) => v.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} stroke="#807381" />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  formatter={(value: number, name: string) => [value, name === 'orders' ? t('Orders') : t('Revenue')]}
                />
                <Area type="monotone" dataKey="orders" stroke="#763952" fill="url(#colorOrders)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Worker Contribution Pie */}
        <div className="bg-surface-container-lowest p-6 rounded-2xl">
          <h3 className="font-headline font-bold text-lg mb-6">{t('Worker Contribution')}</h3>
          {workerContribution.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-secondary">
              <span className="material-symbols-outlined text-4xl mb-2">pie_chart</span>
              <p className="text-sm">{t('No worker data.')}</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={workerContribution}
                  dataKey="task_count"
                  nameKey="worker_name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={50}
                  paddingAngle={2}
                  label={({ worker_name, percent }: any) => `${worker_name} ${(percent * 100).toFixed(0)}%`}
                >
                  {workerContribution.map((_entry, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Daily Revenue Bar Chart */}
      <div className="bg-surface-container-lowest p-6 rounded-2xl mb-10">
        <h3 className="font-headline font-bold text-lg mb-6">{t('Daily Revenue')}</h3>
        {dailyStats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-secondary">
            <span className="material-symbols-outlined text-4xl mb-2">bar_chart</span>
            <p className="text-sm">{t('No revenue data.')}</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={dailyStats}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e8e9" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#807381" tickFormatter={(v: string) => v.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} stroke="#807381" />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                formatter={(value: number) => [formatCurrency(value), t('Revenue')]}
              />
              <Bar dataKey="revenue" fill="#763952" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Worker Performance Table */}
      {safeData.workerPerformance.length > 0 && (
        <section className="bg-surface-container-lowest rounded-2xl overflow-hidden mb-10">
          <div className="p-6 border-b border-surface-container">
            <h3 className="font-headline font-bold text-xl">{t('Worker Performance')}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('Worker')}</th>
                  <th className="text-center">{t('Orders')}</th>
                  <th className="text-center">%</th>
                  <th className="text-right">{t('Revenue')}</th>
                </tr>
              </thead>
              <tbody>
                {safeData.workerPerformance.map((w) => (
                  <tr key={w.worker_id}>
                    <td className="font-semibold text-sm">{w.worker_name}</td>
                    <td className="text-center font-headline font-bold">{w.order_count}</td>
                    <td className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 h-2 bg-surface-container rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${w.percentage}%` }} />
                        </div>
                        <span className="text-sm font-bold text-secondary">{w.percentage}%</span>
                      </div>
                    </td>
                    <td className="text-right font-headline font-bold text-sm">{formatCurrency(w.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Orders Table */}
      <section className="bg-surface-container-lowest rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-surface-container flex justify-between items-center">
          <h3 className="font-headline font-bold text-xl">{t('Filtered Orders')}</h3>
          <span className="text-xs text-secondary font-bold">{safeData.orders.length} {t('orders')}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('Order')}</th>
                <th>{t('Customer')}</th>
                <th>{t('Service')}</th>
                <th>{t('Status')}</th>
                <th className="text-right">{t('Value')}</th>
              </tr>
            </thead>
            <tbody>
              {safeData.orders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-secondary">
                    <span className="material-symbols-outlined text-4xl mb-2 block">inbox</span>
                    {t('No orders match the selected filters.')}
                  </td>
                </tr>
              ) : (
                safeData.orders.map((o) => (
                  <tr key={o.id}>
                    <td className="font-headline font-bold text-sm text-primary">{o.order_number}</td>
                    <td className="text-sm font-semibold">{o.customer_name || '--'}</td>
                    <td className="text-sm">{o.piece_type}</td>
                    <td><span className={`chip ${statusChipClass(o.status)}`}>{statusLabel(o.status)}</span></td>
                    <td className="text-right font-headline font-bold text-sm">{formatCurrency(o.price)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ animation: 'modalBackdropIn 200ms ease-out forwards' }}>
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowEmailModal(false)} />
          <div className="relative bg-surface-container-lowest rounded-2xl p-8 w-full max-w-md shadow-2xl" style={{ animation: 'modalContentIn 250ms ease-out forwards' }}>
            <h3 className="font-headline font-bold text-xl mb-6">{t('Send Report via Email')}</h3>
            <div className="mb-4">
              <label className="text-xs font-bold text-secondary uppercase tracking-wider block mb-1.5">{t('Recipient Email')}</label>
              <input
                type="email"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                placeholder="email@example.com"
                className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none"
              />
            </div>
            <p className="text-xs text-secondary mb-6">{t('This will open your email client with the report data.')}</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowEmailModal(false)}
                className="px-5 py-2.5 rounded-lg font-headline font-bold text-sm text-secondary hover:text-on-surface transition-colors"
              >
                {t('Cancel')}
              </button>
              <button
                onClick={handleSendEmail}
                disabled={!emailTo}
                className="px-5 py-2.5 bg-primary text-on-primary rounded-lg font-headline font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {emailSent ? t('Sent!') : t('Send')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
