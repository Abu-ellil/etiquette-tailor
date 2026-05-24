'use client'

import { useEffect, useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import type { AnalyticsData } from '@/types/analytics'
import { useChartColors, ChartTooltip, ChartContainer } from '@/components/charts/ChartProvider'
import { AppShell } from '@/components/layout/AppShell'
import {
  TrendingUp, TrendingDown, DollarSign, ShoppingCart,
  Users, AlertCircle, Wallet,
  ArrowUpRight, ArrowDownRight,
  Loader2,
} from 'lucide-react'

const STATUS_LABELS: Record<string, string> = {
  intake: 'استلام', cutting: 'قَصّ', sewing: 'خياطة', finishing: 'تشطيب',
  ready: 'جاهز', delivered: 'مُسلّم', cancelled: 'ملغي',
}

const STATUS_COLORS: Record<string, string> = {
  intake: '#6366f1', cutting: '#f59e0b', sewing: '#3b82f6', finishing: '#8b5cf6',
  ready: '#10b981', delivered: '#059669', cancelled: '#ef4444',
}

const STATUS_THEME: Record<string, { bg: string; color: string }> = {
  intake: { bg: 'var(--accent-primary-light)', color: 'var(--accent-primary)' },
  cutting: { bg: 'var(--accent-warning-light)', color: 'var(--accent-warning)' },
  sewing: { bg: 'var(--accent-info-light)', color: 'var(--accent-info)' },
  finishing: { bg: 'var(--accent-primary-light)', color: '#8b5cf6' },
  ready: { bg: 'var(--accent-success-light)', color: 'var(--accent-success)' },
  delivered: { bg: 'var(--accent-success-light)', color: '#059669' },
  cancelled: { bg: 'var(--accent-danger-light)', color: 'var(--accent-danger)' },
}

const CATEGORY_LABELS: Record<string, string> = {
  rent: 'إيجار', utilities: 'مرافق', materials: 'مواد', fabric: 'أقمشة',
  supplies: 'مستلزمات', salaries: 'رواتب', other: 'أخرى',
}

const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899']

export default function DashboardPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const chartColors = useChartColors()

  useEffect(() => { fetchAnalytics() }, [])

  const fetchAnalytics = async () => {
    try {
      const res = await fetch('/api/analytics')
      if (!res.ok) throw new Error('Failed to fetch')
      const analytics = await res.json()
      if (analytics.error) {
        setError(analytics.error + (analytics.details ? '\n' + analytics.details : ''))
      } else {
        setData(analytics)
      }
    } catch {
      setError('فشل تحميل البيانات')
    } finally {
      setLoading(false)
    }
  }

  const fmt = (amount: number) => new Intl.NumberFormat('ar-QA', { style: 'currency', currency: 'QAR', maximumFractionDigits: 0 }).format(amount)
  const fmtN = (n: number) => n.toLocaleString('ar-QA')

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-10 h-10 animate-spin text-accent-primary" />
        </div>
      </AppShell>
    )
  }

  if (!data) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center max-w-sm">
            <AlertCircle className="w-12 h-12 text-accent-danger mx-auto mb-4" />
            <p className="text-accent-danger text-lg font-semibold mb-2">فشل تحميل البيانات</p>
            <p className="text-text-tertiary text-sm">{error || 'تأكد من إعداد Supabase'}</p>
          </div>
        </div>
      </AppShell>
    )
  }

  const { summary, branches, statusDistribution, monthlyRevenue, expensesByCategory, topCustomers, recentOrders } = data

  const statusData = Object.entries(statusDistribution).map(([status, count]) => ({
    name: STATUS_LABELS[status] || status,
    value: count,
    color: STATUS_COLORS[status] || '#94a3b8',
  }))

  const expenseData = Object.entries(expensesByCategory).map(([cat, amount]) => ({
    name: CATEGORY_LABELS[cat] || cat,
    value: amount,
  }))

  const branchComparison = Object.entries(branches).map(([id, b]) => ({
    name: b.name,
    revenue: b.totalRevenue,
    expenses: b.totalExpenses,
    profit: b.netProfit,
    orders: b.orderCount,
  }))

  const monthlyData = monthlyRevenue.map(m => ({
    month: new Date(m.month + '-01').toLocaleDateString('ar-QA', { month: 'short' }),
    revenue: m.revenue,
  }))

  return (
    <AppShell>
      {/* Page Header */}
      <div className="mb-6 md:mb-7">
        <h1 className="page-title">لوحة التحكم</h1>
        <p className="page-subtitle">نظرة شاملة على أداء أعمالك</p>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid gap-mb-mobile">
        <div className="kpi-card">
          <div className="flex items-center justify-between mb-2">
            <p className="kpi-title">إجمالي الإيرادات</p>
            <div className="kpi-icon" style={{ background: 'var(--accent-primary-light)' }}>
              <DollarSign style={{ width: 16, height: 16, color: 'var(--accent-primary)' }} />
            </div>
          </div>
          <p className="kpi-value">{fmt(summary.totalRevenue)}</p>
          {summary.revenueGrowth !== undefined && (
            <div className="flex items-center gap-1 mt-1">
              {summary.revenueGrowth > 0 ? <ArrowUpRight size={14} style={{ color: 'var(--accent-success)' }} /> : summary.revenueGrowth < 0 ? <ArrowDownRight size={14} style={{ color: 'var(--accent-danger)' }} /> : null}
              <span style={{ fontSize: 12, fontWeight: 600, color: summary.revenueGrowth >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
                {summary.revenueGrowth > 0 ? '+' : ''}{summary.revenueGrowth}%
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>هذا الأسبوع</span>
            </div>
          )}
        </div>

        <div className="kpi-card">
          <div className="flex items-center justify-between mb-2">
            <p className="kpi-title">صافي الربح</p>
            <div className="kpi-icon" style={{ background: 'var(--accent-success-light)' }}>
              <TrendingUp style={{ width: 16, height: 16, color: 'var(--accent-success)' }} />
            </div>
          </div>
          <p className="kpi-value">{fmt(summary.netProfit)}</p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            {summary.netProfit > 0 ? 'ربح' : 'خسارة'}
          </p>
        </div>

        <div className="kpi-card">
          <div className="flex items-center justify-between mb-2">
            <p className="kpi-title">الطلبات</p>
            <div className="kpi-icon" style={{ background: 'var(--accent-info-light)' }}>
              <ShoppingCart style={{ width: 16, height: 16, color: 'var(--accent-info)' }} />
            </div>
          </div>
          <p className="kpi-value">{fmtN(summary.totalOrders)}</p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            هذا الأسبوع: {fmt(summary.thisWeekRevenue || 0)}
          </p>
        </div>

        <div className="kpi-card">
          <div className="flex items-center justify-between mb-2">
            <p className="kpi-title">العملاء</p>
            <div className="kpi-icon" style={{ background: 'var(--accent-primary-light)' }}>
              <Users style={{ width: 16, height: 16, color: '#8b5cf6' }} />
            </div>
          </div>
          <p className="kpi-value">{fmtN(summary.customersCount)}</p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>إجمالي العملاء</p>
        </div>

        <div className="kpi-card">
          <div className="flex items-center justify-between mb-2">
            <p className="kpi-title">المتبقي مستحق</p>
            <div className="kpi-icon" style={{ background: 'var(--accent-warning-light)' }}>
              <Wallet style={{ width: 16, height: 16, color: 'var(--accent-warning)' }} />
            </div>
          </div>
          <p className="kpi-value">{fmt(summary.totalBalance)}</p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>ديون العملاء</p>
        </div>
      </div>

      {/* Revenue Trend + Status Distribution */}
      <div className="chart-row-2 gap-mb-mobile">
        <ChartContainer title="الإيرادات الشهرية" subtitle="آخر 12 شهر">
          <AreaChart data={monthlyData}>
            <defs>
              <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartColors.colors[0]} stopOpacity={0.3} />
                <stop offset="95%" stopColor={chartColors.colors[0]} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
            <XAxis dataKey="month" tick={{ fill: chartColors.text, fontSize: 12 }} />
            <YAxis tick={{ fill: chartColors.text, fontSize: 12 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip content={<ChartTooltip formatter={(v) => fmt(v ?? 0)} />} />
            <Area type="monotone" dataKey="revenue" stroke={chartColors.colors[0]} strokeWidth={2.5} fill="url(#revenueGrad)" name="الإيرادات" />
          </AreaChart>
        </ChartContainer>

        <ChartContainer title="حالة الطلبات" subtitle={`${fmtN(summary.totalOrders)} طلب`}>
          <PieChart>
            <Pie data={statusData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
              {statusData.map((entry, i) => (
                <Cell key={i} fill={entry.color} stroke="transparent" />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
            <Legend verticalAlign="bottom" iconType="circle" iconSize={8} formatter={(value: string) => <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{value}</span>} />
          </PieChart>
        </ChartContainer>
      </div>

      {/* Branch Comparison */}
      <ChartContainer title="مقارنة الفروع" subtitle="الإيرادات والمصروفات والأرباح" className="gap-mb-mobile">
        <BarChart data={branchComparison} barGap={8}>
          <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
          <XAxis dataKey="name" tick={{ fill: chartColors.text, fontSize: 12 }} />
          <YAxis tick={{ fill: chartColors.text, fontSize: 12 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
          <Tooltip content={<ChartTooltip formatter={(v) => fmt(v ?? 0)} />} />
          <Legend iconType="circle" iconSize={8} formatter={(value: string) => <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{value}</span>} />
          <Bar dataKey="revenue" name="الإيرادات" fill={chartColors.colors[0]} radius={[6, 6, 0, 0]} />
          <Bar dataKey="expenses" name="المصروفات" fill={chartColors.colors[3]} radius={[6, 6, 0, 0]} />
          <Bar dataKey="profit" name="صافي الربح" fill={chartColors.colors[1]} radius={[6, 6, 0, 0]} />
        </BarChart>
      </ChartContainer>

      {/* Branch Cards + Expense Pie */}
      <div className="equal-row gap-mb-mobile">
        {Object.entries(branches).map(([id, branch]) => (
          <div key={id} className="card">
            <div className="flex justify-between items-center mb-5">
              <div>
                <h3 className="section-title">{branch.name}</h3>
                <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 2 }}>{branch.orderCount} طلب</p>
              </div>
              <span
                className="status-badge"
                style={{
                  background: branch.netProfit > 0 ? 'var(--accent-success-light)' : 'var(--accent-danger-light)',
                  color: branch.netProfit > 0 ? 'var(--accent-success)' : 'var(--accent-danger)',
                }}
              >
                {branch.netProfit > 0 ? <TrendingUp size={14} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: 4 }} /> : <TrendingDown size={14} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: 4 }} />}
                {fmt(branch.netProfit)}
              </span>
            </div>
            <div className="mini-stats">
              <div className="mini-stat">
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>الإيرادات</p>
                <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent-primary)' }}>{fmt(branch.totalRevenue)}</p>
              </div>
              <div className="mini-stat">
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>المدفوع</p>
                <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent-success)' }}>{fmt(branch.totalPaid)}</p>
              </div>
              <div className="mini-stat">
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>المتبقي</p>
                <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent-warning)' }}>{fmt(branch.totalBalance)}</p>
              </div>
              <div className="mini-stat">
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>مكتملة</p>
                <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent-success)' }}>{fmtN(branch.completedOrders)}</p>
              </div>
              <div className="mini-stat">
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>قيد التنفيذ</p>
                <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent-warning)' }}>{fmtN(branch.pendingOrders)}</p>
              </div>
              <div className="mini-stat">
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>متوسط الطلب</p>
                <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent-info)' }}>{fmt(branch.avgOrderValue)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Expense Breakdown + Top Customers */}
      <div className="equal-row gap-mb-mobile">
        <ChartContainer title="المصروفات حسب الفئة" subtitle={`الإجمالي: ${fmt(summary.totalExpenses)}`}>
          {expenseData.length > 0 ? (
            <PieChart>
              <Pie data={expenseData} cx="50%" cy="50%" outerRadius={100} innerRadius={50} paddingAngle={3} dataKey="value" nameKey="name">
                {expenseData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip formatter={(v) => fmt(v ?? 0)} />} />
              <Legend verticalAlign="bottom" iconType="circle" iconSize={8} formatter={(value: string) => <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{value}</span>} />
            </PieChart>
          ) : (
            <div className="flex items-center justify-center h-full text-text-muted">
              لا توجد مصروفات مسجلة
            </div>
          )}
        </ChartContainer>

        <div className="card">
          <h3 className="section-title mb-5">أفضل العملاء</h3>
          {topCustomers.length === 0 ? (
            <div className="text-text-muted text-center py-10">لا توجد بيانات عملاء</div>
          ) : (
            <div className="flex flex-col gap-3">
              {topCustomers.map((customer, i) => (
                <div key={customer.id} className="customer-row">
                  <div
                    className="customer-avatar"
                    style={{
                      background: PIE_COLORS[i % PIE_COLORS.length] + '22',
                      color: PIE_COLORS[i % PIE_COLORS.length],
                    }}
                  >
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text-primary truncate">{customer.name}</p>
                    <p className="text-xs text-text-muted">{customer.orderCount} طلب</p>
                  </div>
                  <p className="text-sm font-bold text-text-primary">{fmt(customer.totalSpent)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="section-header">
          <div>
            <h3 className="section-title">آخر الطلبات</h3>
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 4 }}>آخر 10 طلبات</p>
          </div>
          <a href="/orders" className="text-accent-primary text-sm font-semibold no-underline">
            عرض الكل ←
          </a>
        </div>

        <div className="table-scroll">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-tertiary)' }}>
                {['العميل', 'الفرع', 'المبلغ', 'المدفوع', 'الحالة', 'التاريخ'].map(h => (
                  <th key={h} style={{
                    padding: '12px 16px',
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    textAlign: 'right',
                    borderBottom: '1px solid var(--border-primary)',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order) => {
                const sc = STATUS_THEME[order.status] || { bg: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }
                return (
                  <tr key={order.id} className="data-row">
                    <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
                      {order.customer_name}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-secondary)' }}>
                      {branches[order.branch_id]?.name || `فرع ${order.branch_id}`}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                      {fmt(order.price)}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 14, color: 'var(--accent-success)' }}>
                      {fmt(order.paid)}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className="status-badge" style={{ background: sc.bg, color: sc.color }}>
                        {STATUS_LABELS[order.status] || order.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-muted)' }}>
                      {new Date(order.created_at).toLocaleDateString('ar-QA', { month: 'short', day: 'numeric' })}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  )
}
