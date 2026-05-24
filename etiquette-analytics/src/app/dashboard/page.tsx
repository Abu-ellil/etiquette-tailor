'use client'

import { useEffect, useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import type { AnalyticsData } from '@/types/analytics'
import { useTheme } from '@/contexts/ThemeContext'
import { useChartColors, ChartTooltip, ChartContainer } from '@/components/charts/ChartProvider'
import { Navbar } from '@/components/layout/Navbar'
import {
  TrendingUp, TrendingDown, DollarSign, ShoppingCart,
  Users, AlertCircle, Clock, CheckCircle2, XCircle,
  ArrowUpRight, ArrowDownRight, Activity, Wallet,
  Loader2, CalendarDays, PieChart as PieChartIcon,
} from 'lucide-react'

const STATUS_LABELS: Record<string, string> = {
  intake: 'استلام',
  cutting: 'قَصّ',
  sewing: 'خياطة',
  finishing: 'تشطيب',
  ready: 'جاهز',
  delivered: 'مُسلّم',
  cancelled: 'ملغي',
}

const STATUS_COLORS: Record<string, string> = {
  intake: '#6366f1',
  cutting: '#f59e0b',
  sewing: '#3b82f6',
  finishing: '#8b5cf6',
  ready: '#10b981',
  delivered: '#059669',
  cancelled: '#ef4444',
}

const CATEGORY_LABELS: Record<string, string> = {
  rent: 'إيجار',
  utilities: 'مرافق',
  materials: 'مواد',
  fabric: 'أقمشة',
  supplies: 'مستلزمات',
  salaries: 'رواتب',
  other: 'أخرى',
}

const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899']

export default function DashboardPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { theme } = useTheme()
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

  const fmt = (amount: number) => new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 }).format(amount)
  const fmtN = (n: number) => n.toLocaleString('ar-SA')

  const cardBg = theme === 'dark' ? '#1a1c2e' : '#ffffff'
  const cardBorder = theme === 'dark' ? '#2a2d3e' : '#e5e7eb'

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-secondary)' }}>
        <Loader2 style={{ width: 40, height: 40, animation: 'spin 1s linear infinite', color: 'var(--accent-primary)' }} />
      </div>
    )
  }

  if (!data) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-secondary)' }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <AlertCircle style={{ width: 48, height: 48, color: 'var(--accent-danger)', margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--accent-danger)', fontSize: 18, fontWeight: 600, marginBottom: 8 }}>فشل تحميل البيانات</p>
          <p style={{ color: 'var(--text-tertiary)', fontSize: 14 }}>{error || 'تأكد من إعداد Supabase'}</p>
        </div>
      </div>
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
    month: new Date(m.month + '-01').toLocaleDateString('ar-SA', { month: 'short' }),
    revenue: m.revenue,
  }))

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-secondary)' }} dir="rtl">
      <Navbar />

      <main style={{ maxWidth: 1440, margin: '0 auto', padding: '28px 24px' }}>
        {/* Page Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            لوحة التحكم
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-tertiary)', marginTop: 4 }}>
            نظرة شاملة على أداء أعمالك
          </p>
        </div>

        {/* === KPI Cards Row === */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
          <KPICard
            title="إجمالي الإيرادات"
            value={fmt(summary.totalRevenue)}
            icon={<DollarSign size={20} />}
            trend={summary.revenueGrowth}
            trendLabel="هذا الأسبوع"
            color="var(--accent-primary)"
            colorLight="var(--accent-primary-light)"
          />
          <KPICard
            title="صافي الربح"
            value={fmt(summary.netProfit)}
            icon={<TrendingUp size={20} />}
            subtitle={`${summary.netProfit > 0 ? 'ربح' : 'خسارة'}`}
            color="var(--accent-success)"
            colorLight="var(--accent-success-light)"
          />
          <KPICard
            title="الطلبات"
            value={fmtN(summary.totalOrders)}
            icon={<ShoppingCart size={20} />}
            subtitle={`هذا الأسبوع: ${fmt(summary.thisWeekRevenue || 0)}`}
            color="var(--accent-info)"
            colorLight="var(--accent-info-light)"
          />
          <KPICard
            title="العملاء"
            value={fmtN(summary.customersCount)}
            icon={<Users size={20} />}
            subtitle="إجمالي العملاء"
            color="#8b5cf6"
            colorLight={theme === 'dark' ? '#2e1065' : '#f5f3ff'}
          />
          <KPICard
            title="المتبقي مستحق"
            value={fmt(summary.totalBalance)}
            icon={<Wallet size={20} />}
            subtitle="ديون العملاء"
            color="var(--accent-warning)"
            colorLight="var(--accent-warning-light)"
          />
        </div>

        {/* === Row 2: Revenue Trend + Status Distribution === */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 24 }}>
          {/* Revenue Trend Chart */}
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

          {/* Status Distribution Pie */}
          <ChartContainer title="حالة الطلبات" subtitle={`${fmtN(summary.totalOrders)} طلب`}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={3}
                dataKey="value"
              >
                {statusData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
              <Legend
                verticalAlign="bottom"
                iconType="circle"
                iconSize={8}
                formatter={(value: string) => <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{value}</span>}
              />
            </PieChart>
          </ChartContainer>
        </div>

        {/* === Row 3: Branch Comparison === */}
        <ChartContainer title="مقارنة الفروع" subtitle="الإيرادات والمصروفات والأرباح" style={{ marginBottom: 24 }}>
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

        {/* === Row 4: Branch Cards + Expense Pie === */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
          {/* Branch Detail Cards */}
          {Object.entries(branches).map(([id, branch]) => (
            <div key={id} style={{
              background: cardBg,
              border: `1px solid ${cardBorder}`,
              borderRadius: 14,
              padding: 24,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                  <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{branch.name}</h3>
                  <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 2 }}>{branch.orderCount} طلب</p>
                </div>
                <div style={{
                  padding: '4px 12px',
                  borderRadius: 20,
                  background: branch.netProfit > 0 ? 'var(--accent-success-light)' : 'var(--accent-danger-light)',
                  color: branch.netProfit > 0 ? 'var(--accent-success)' : 'var(--accent-danger)',
                  fontSize: 13,
                  fontWeight: 600,
                }}>
                  {branch.netProfit > 0 ? <TrendingUp size={14} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: 4 }} /> : <TrendingDown size={14} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: 4 }} />}
                  {fmt(branch.netProfit)}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <MiniStat label="الإيرادات" value={fmt(branch.totalRevenue)} color="var(--accent-primary)" />
                <MiniStat label="المدفوع" value={fmt(branch.totalPaid)} color="var(--accent-success)" />
                <MiniStat label="المتبقي" value={fmt(branch.totalBalance)} color="var(--accent-warning)" />
                <MiniStat label="مكتملة" value={fmtN(branch.completedOrders)} color="var(--accent-success)" />
                <MiniStat label="قيد التنفيذ" value={fmtN(branch.pendingOrders)} color="var(--accent-warning)" />
                <MiniStat label="متوسط الطلب" value={fmt(branch.avgOrderValue)} color="var(--accent-info)" />
              </div>
            </div>
          ))}
        </div>

        {/* === Row 5: Expense Breakdown + Top Customers === */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
          {/* Expense Breakdown */}
          <ChartContainer title="المصروفات حسب الفئة" subtitle={`الإجمالي: ${fmt(summary.totalExpenses)}`}>
            {expenseData.length > 0 ? (
              <PieChart>
                <Pie
                  data={expenseData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  innerRadius={50}
                  paddingAngle={3}
                  dataKey="value"
                  nameKey="name"
                >
                  {expenseData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip formatter={(v) => fmt(v ?? 0)} />} />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  iconSize={8}
                  formatter={(value: string) => <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{value}</span>}
                />
              </PieChart>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                لا توجد مصروفات مسجلة
              </div>
            )}
          </ChartContainer>

          {/* Top Customers */}
          <div style={{
            background: cardBg,
            border: `1px solid ${cardBorder}`,
            borderRadius: 14,
            padding: 24,
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 20px 0' }}>
              أفضل العملاء
            </h3>
            {topCustomers.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>لا توجد بيانات عملاء</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {topCustomers.map((customer, i) => (
                  <div key={customer.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: theme === 'dark' ? '#22253a' : '#f8f9fb',
                  }}>
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: PIE_COLORS[i % PIE_COLORS.length] + '22',
                      color: PIE_COLORS[i % PIE_COLORS.length],
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: 14,
                      flexShrink: 0,
                    }}>
                      {i + 1}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{customer.name}</p>
                      <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>{customer.orderCount} طلب</p>
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{fmt(customer.totalSpent)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* === Row 6: Recent Orders Table === */}
        <div style={{
          background: cardBg,
          border: `1px solid ${cardBorder}`,
          borderRadius: 14,
          overflow: 'hidden',
        }}>
          <div style={{ padding: '20px 24px', borderBottom: `1px solid ${cardBorder}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>آخر الطلبات</h3>
              <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: '4px 0 0' }}>آخر 10 طلبات</p>
            </div>
            <a href="/orders" style={{ fontSize: 13, color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 600 }}>
              عرض الكل ←
            </a>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: theme === 'dark' ? '#161822' : '#f8f9fb' }}>
                {['العميل', 'الفرع', 'المبلغ', 'المدفوع', 'الحالة', 'التاريخ'].map(h => (
                  <th key={h} style={{
                    padding: '12px 16px',
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    textAlign: 'right',
                    borderBottom: `1px solid ${cardBorder}`,
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order) => (
                <tr key={order.id} style={{ borderBottom: `1px solid ${cardBorder}` }}>
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
                    <StatusBadge status={order.status} />
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-muted)' }}>
                    {new Date(order.created_at).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}

// === Sub-components ===

function KPICard({ title, value, icon, trend, trendLabel, subtitle, color, colorLight }: {
  title: string
  value: string
  icon: React.ReactNode
  trend?: number
  trendLabel?: string
  subtitle?: string
  color: string
  colorLight: string
}) {
  const { theme } = useTheme()
  return (
    <div style={{
      background: theme === 'dark' ? '#1a1c2e' : '#ffffff',
      border: `1px solid ${theme === 'dark' ? '#2a2d3e' : '#e5e7eb'}`,
      borderRadius: 14,
      padding: 22,
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: 0 }}>{title}</p>
        <div style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          background: colorLight,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: color,
        }}>
          {icon}
        </div>
      </div>
      <p style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: -0.5 }}>{value}</p>
      {(trend !== undefined && trendLabel) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
          {trend > 0 ? (
            <ArrowUpRight size={14} style={{ color: 'var(--accent-success)' }} />
          ) : trend < 0 ? (
            <ArrowDownRight size={14} style={{ color: 'var(--accent-danger)' }} />
          ) : null}
          <span style={{ fontSize: 12, fontWeight: 600, color: trend > 0 ? 'var(--accent-success)' : trend < 0 ? 'var(--accent-danger)' : 'var(--text-muted)' }}>
            {trend > 0 ? '+' : ''}{trend}%
          </span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{trendLabel}</span>
        </div>
      )}
      {subtitle && !trendLabel && (
        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0' }}>{subtitle}</p>
      )}
    </div>
  )
}

function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  const { theme } = useTheme()
  return (
    <div style={{
      padding: 12,
      borderRadius: 10,
      background: theme === 'dark' ? '#22253a' : '#f8f9fb',
    }}>
      <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 4px' }}>{label}</p>
      <p style={{ fontSize: 15, fontWeight: 700, color, margin: 0 }}>{value}</p>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const { theme } = useTheme()
  const config: Record<string, { label: string; bg: string; color: string }> = {
    intake: { label: 'استلام', bg: theme === 'dark' ? '#1e1b4b' : '#eef2ff', color: theme === 'dark' ? '#818cf8' : '#6366f1' },
    cutting: { label: 'قَصّ', bg: theme === 'dark' ? '#78350f' : '#fffbeb', color: theme === 'dark' ? '#fbbf24' : '#f59e0b' },
    sewing: { label: 'خياطة', bg: theme === 'dark' ? '#1e3a5f' : '#eff6ff', color: theme === 'dark' ? '#60a5fa' : '#3b82f6' },
    finishing: { label: 'تشطيب', bg: theme === 'dark' ? '#2e1065' : '#f5f3ff', color: theme === 'dark' ? '#a78bfa' : '#8b5cf6' },
    ready: { label: 'جاهز', bg: theme === 'dark' ? '#064e3b' : '#ecfdf5', color: theme === 'dark' ? '#34d399' : '#10b981' },
    delivered: { label: 'مُسلّم', bg: theme === 'dark' ? '#064e3b' : '#ecfdf5', color: theme === 'dark' ? '#34d399' : '#059669' },
    cancelled: { label: 'ملغي', bg: theme === 'dark' ? '#7f1d1d' : '#fef2f2', color: theme === 'dark' ? '#f87171' : '#ef4444' },
  }
  const c = config[status] || { label: status, bg: theme === 'dark' ? '#22253a' : '#f1f3f5', color: 'var(--text-secondary)' }
  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 10px',
      borderRadius: 20,
      fontSize: 12,
      fontWeight: 600,
      background: c.bg,
      color: c.color,
    }}>
      {c.label}
    </span>
  )
}
