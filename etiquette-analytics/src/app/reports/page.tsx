'use client'

import { useState, useEffect } from 'react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts'
import { useTheme } from '@/contexts/ThemeContext'
import { useChartColors, ChartTooltip, ChartContainer } from '@/components/charts/ChartProvider'
import { Navbar } from '@/components/layout/Navbar'
import {
  TrendingUp, TrendingDown, DollarSign, Calendar,
  ArrowUpRight, ArrowDownRight, Loader2, Download,
  Filter, PieChart as PieIcon, BarChart3, Activity,
} from 'lucide-react'

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

type Period = 'week' | 'month' | 'quarter' | 'year' | 'all'

export default function ReportsPage() {
  const { theme } = useTheme()
  const chartColors = useChartColors()
  const [analyticsData, setAnalyticsData] = useState<any>(null)
  const [expensesData, setExpensesData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<Period>('month')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedBranch, setSelectedBranch] = useState<string>('all')

  useEffect(() => {
    const now = new Date()
    let start: Date
    switch (period) {
      case 'week':
        start = new Date(now.getTime() - 7 * 86400000); break
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1); break
      case 'quarter':
        const qMonth = Math.floor(now.getMonth() / 3) * 3
        start = new Date(now.getFullYear(), qMonth, 1); break
      case 'year':
        start = new Date(now.getFullYear(), 0, 1); break
      case 'all':
        start = new Date(2020, 0, 1); break
    }
    setStartDate(start.toISOString().split('T')[0])
    setEndDate(now.toISOString().split('T')[0])
  }, [period])

  useEffect(() => {
    if (startDate && endDate) fetchData()
  }, [startDate, endDate])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [analyticsRes, expensesRes] = await Promise.all([
        fetch('/api/analytics'),
        fetch(`/api/expenses?start_date=${startDate}&end_date=${endDate}`),
      ])
      const analytics = await analyticsRes.json()
      const expensesJson = await expensesRes.json()
      setAnalyticsData(analytics)
      setExpensesData(expensesJson.expenses || [])
    } catch (e) {
      console.error('Error fetching reports:', e)
    } finally {
      setLoading(false)
    }
  }

  const fmt = (amount: number) => new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 }).format(amount)
  const fmtN = (n: number) => n.toLocaleString('ar-SA')

  const cardBg = theme === 'dark' ? '#1a1c2e' : '#ffffff'
  const cardBorder = theme === 'dark' ? '#2a2d3e' : '#e5e7eb'

  if (loading || !analyticsData) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-secondary)' }}>
        <Loader2 style={{ width: 40, height: 40, animation: 'spin 1s linear infinite', color: 'var(--accent-primary)' }} />
      </div>
    )
  }

  const summary = analyticsData.summary || {}
  const branches = analyticsData.branches || {}
  const monthlyRevenue = analyticsData.monthlyRevenue || []

  const totalExpenses = expensesData.reduce((s, e) => s + (e.amount || 0), 0)
  const totalRevenue = summary.totalRevenue || 0
  const netProfit = totalRevenue - totalExpenses
  const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100) : 0

  // Expense breakdown by category
  const expenseByCategory = expensesData.reduce((acc: Record<string, number>, e: any) => {
    acc[e.category] = (acc[e.category] || 0) + (e.amount || 0)
    return acc
  }, {})
  const expenseChartData = Object.entries(expenseByCategory).map(([cat, amount]) => ({
    name: CATEGORY_LABELS[cat] || cat,
    value: amount,
  }))

  // Monthly expenses vs revenue chart
  const revenueVsExpense = monthlyRevenue.map((m: { month: string; revenue: number }) => {
    const monthExpenses = expensesData
      .filter((e: any) => new Date(e.expense_date).toISOString().startsWith(m.month))
      .reduce((s: number, e: any) => s + (e.amount || 0), 0)
    return {
      month: new Date(m.month + '-01').toLocaleDateString('ar-SA', { month: 'short' }),
      الإيرادات: m.revenue,
      المصروفات: monthExpenses,
      'صافي الربح': m.revenue - monthExpenses,
    }
  })

  // Branch-level P&L
  const branchPL = Object.entries(branches).map(([id, b]: [string, any]) => {
    const bExpenses = expensesData.filter(e => e.branch_id === parseInt(id)).reduce((s, e) => s + (e.amount || 0), 0)
    return {
      name: b.name,
      revenue: b.totalRevenue,
      expenses: bExpenses,
      profit: b.totalRevenue - bExpenses,
      orders: b.orderCount,
      margin: b.totalRevenue > 0 ? ((b.totalRevenue - bExpenses) / b.totalRevenue * 100) : 0,
    }
  })

  // Daily cash flow
  const dailyMap: Record<string, { inflow: number; outflow: number }> = {}
  expensesData.forEach(e => {
    const d = e.expense_date
    if (!dailyMap[d]) dailyMap[d] = { inflow: 0, outflow: 0 }
    dailyMap[d].outflow += e.amount || 0
  })

  const dailyRevenue: { date: string; revenue: number }[] = analyticsData.dailyRevenue || []
  dailyRevenue.forEach(d => {
    if (!dailyMap[d.date]) dailyMap[d.date] = { inflow: 0, outflow: 0 }
    dailyMap[d.date].inflow += d.revenue
  })

  const cashFlowData = Object.entries(dailyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-30)
    .map(([date, v]) => ({
      date: new Date(date).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' }),
      'الإيرادات': v.inflow,
      'المصروفات': v.outflow,
      'صافي': v.inflow - v.outflow,
    }))

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-secondary)' }} dir="rtl">
      <Navbar />

      <main style={{ maxWidth: 1440, margin: '0 auto', padding: '28px 24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>التقارير المالية</h1>
            <p style={{ fontSize: 14, color: 'var(--text-tertiary)', marginTop: 4 }}>تحليل شامل للإيرادات والمصروفات والأرباح</p>
          </div>
        </div>

        {/* Period Filter */}
        <div style={{
          background: cardBg,
          border: `1px solid ${cardBorder}`,
          borderRadius: 14,
          padding: '14px 20px',
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}>
          <Filter size={18} style={{ color: 'var(--text-muted)' }} />
          {(['week', 'month', 'quarter', 'year', 'all'] as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                padding: '6px 16px',
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
                transition: 'all 0.15s ease',
                ...(period === p
                  ? { background: 'var(--accent-primary)', color: '#fff' }
                  : { background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }
                ),
              }}
            >
              {p === 'week' ? 'أسبوع' : p === 'month' ? 'شهر' : p === 'quarter' ? 'ربع سنة' : p === 'year' ? 'سنة' : 'الكل'}
            </button>
          ))}
          <div style={{ marginRight: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="date"
              value={startDate}
              onChange={e => { setStartDate(e.target.value); setPeriod('all' as Period) }}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                border: `1px solid ${cardBorder}`,
                background: 'var(--bg-input)',
                color: 'var(--text-primary)',
                fontSize: 13,
              }}
            />
            <span style={{ color: 'var(--text-muted)' }}>—</span>
            <input
              type="date"
              value={endDate}
              onChange={e => { setEndDate(e.target.value); setPeriod('all' as Period) }}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                border: `1px solid ${cardBorder}`,
                background: 'var(--bg-input)',
                color: 'var(--text-primary)',
                fontSize: 13,
              }}
            />
          </div>
        </div>

        {/* === P&L Summary Cards === */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
          <PLCard
            title="إجمالي الإيرادات"
            value={fmt(totalRevenue)}
            icon={<TrendingUp size={20} />}
            color="var(--accent-primary)"
            colorLight="var(--accent-primary-light)"
          />
          <PLCard
            title="إجمالي المصروفات"
            value={fmt(totalExpenses)}
            icon={<TrendingDown size={20} />}
            color="var(--accent-danger)"
            colorLight="var(--accent-danger-light)"
          />
          <PLCard
            title="صافي الربح"
            value={fmt(netProfit)}
            icon={<DollarSign size={20} />}
            subtitle={netProfit >= 0 ? 'ربح' : 'خسارة'}
            color={netProfit >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)'}
            colorLight={netProfit >= 0 ? 'var(--accent-success-light)' : 'var(--accent-danger-light)'}
          />
          <PLCard
            title="هامش الربح"
            value={`${profitMargin.toFixed(1)}%`}
            icon={<Activity size={20} />}
            subtitle={profitMargin >= 20 ? 'ممتاز' : profitMargin >= 10 ? 'جيد' : profitMargin >= 0 ? 'مقبول' : 'خسارة'}
            color={profitMargin >= 20 ? 'var(--accent-success)' : profitMargin >= 0 ? 'var(--accent-warning)' : 'var(--accent-danger)'}
            colorLight={profitMargin >= 20 ? 'var(--accent-success-light)' : profitMargin >= 0 ? 'var(--accent-warning-light)' : 'var(--accent-danger-light)'}
          />
          <PLCard
            title="الديون المتبقية"
            value={fmt(summary.totalBalance || 0)}
            icon={<Calendar size={20} />}
            subtitle="من العملاء"
            color="var(--accent-warning)"
            colorLight="var(--accent-warning-light)"
          />
        </div>

        {/* === Revenue vs Expenses Trend === */}
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16, marginBottom: 24 }}>
          <ChartContainer title="الإيرادات مقابل المصروفات" subtitle="الشهرية">
            <BarChart data={revenueVsExpense} barGap={6}>
              <defs>
                <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColors.colors[1]} stopOpacity={0.6} />
                  <stop offset="95%" stopColor={chartColors.colors[1]} stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
              <XAxis dataKey="month" tick={{ fill: chartColors.text, fontSize: 12 }} />
              <YAxis tick={{ fill: chartColors.text, fontSize: 12 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<ChartTooltip formatter={(v) => fmt(v)} />} />
              <Legend iconType="circle" iconSize={8} formatter={(v: string) => <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{v}</span>} />
              <Bar dataKey="الإيرادات" fill={chartColors.colors[0]} radius={[4, 4, 0, 0]} />
              <Bar dataKey="المصروفات" fill={chartColors.colors[3]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>

          {/* Expense Pie Chart */}
          <ChartContainer title="توزيع المصروفات" subtitle={fmt(totalExpenses)}>
            {expenseChartData.length > 0 ? (
              <PieChart>
                <Pie
                  data={expenseChartData}
                  cx="50%"
                  cy="50%"
                  outerRadius={95}
                  innerRadius={50}
                  paddingAngle={3}
                  dataKey="value"
                  nameKey="name"
                >
                  {expenseChartData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip formatter={(v) => fmt(v)} />} />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  iconSize={8}
                  formatter={(v: string) => <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{v}</span>}
                />
              </PieChart>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                لا توجد مصروفات في هذه الفترة
              </div>
            )}
          </ChartContainer>
        </div>

        {/* === Cash Flow + Branch P&L === */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
          {/* Daily Cash Flow */}
          <ChartContainer title="التدفق النقدي اليومي" subtitle="آخر 30 يوم">
            <AreaChart data={cashFlowData}>
              <defs>
                <linearGradient id="inflowGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColors.colors[1]} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={chartColors.colors[1]} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="outflowGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColors.colors[3]} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={chartColors.colors[3]} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
              <XAxis dataKey="date" tick={{ fill: chartColors.text, fontSize: 11 }} interval={4} />
              <YAxis tick={{ fill: chartColors.text, fontSize: 12 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<ChartTooltip formatter={(v) => fmt(v)} />} />
              <Area type="monotone" dataKey="الإيرادات" stroke={chartColors.colors[1]} strokeWidth={2} fill="url(#inflowGrad)" />
              <Area type="monotone" dataKey="المصروفات" stroke={chartColors.colors[3]} strokeWidth={2} fill="url(#outflowGrad)" />
            </AreaChart>
          </ChartContainer>

          {/* Branch P&L */}
          <div style={{
            background: cardBg,
            border: `1px solid ${cardBorder}`,
            borderRadius: 14,
            padding: 24,
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 20px 0' }}>
              الأرباح والخسائر حسب الفرع
            </h3>

            {branchPL.map((branch, i) => (
              <div key={i} style={{
                padding: 16,
                borderRadius: 12,
                background: theme === 'dark' ? '#22253a' : '#f8f9fb',
                marginBottom: i < branchPL.length - 1 ? 12 : 0,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{branch.name}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>{branch.orders} طلب</p>
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <p style={{
                      margin: 0,
                      fontSize: 18,
                      fontWeight: 800,
                      color: branch.profit >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)',
                    }}>
                      {fmt(branch.profit)}
                    </p>
                    <p style={{
                      margin: '2px 0 0',
                      fontSize: 12,
                      fontWeight: 600,
                      color: branch.margin >= 20 ? 'var(--accent-success)' : branch.margin >= 0 ? 'var(--accent-warning)' : 'var(--accent-danger)',
                    }}>
                      هامش {branch.margin.toFixed(1)}%
                    </p>
                  </div>
                </div>
                {/* Progress bar showing profit margin */}
                <div style={{
                  width: '100%',
                  height: 6,
                  borderRadius: 3,
                  background: theme === 'dark' ? '#1a1c2e' : '#e5e7eb',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(Math.max(Math.abs(branch.margin), 0), 100)}%`,
                    borderRadius: 3,
                    background: branch.margin >= 20 ? 'var(--accent-success)' : branch.margin >= 0 ? 'var(--accent-warning)' : 'var(--accent-danger)',
                    transition: 'width 0.5s ease',
                  }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>الإيرادات</p>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--accent-primary)' }}>{fmt(branch.revenue)}</p>
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>المصروفات</p>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--accent-danger)' }}>{fmt(branch.expenses)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* === Revenue Breakdown Table === */}
        <div style={{
          background: cardBg,
          border: `1px solid ${cardBorder}`,
          borderRadius: 14,
          padding: 24,
          marginBottom: 24,
        }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 20px 0' }}>
            ملخص الأداء المالي
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {/* Revenue Summary */}
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', margin: '0 0 12px' }}>ملخص الإيرادات</h4>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <TableRow label="إجمالي الطلبات" value={fmtN(summary.totalOrders || 0)} />
                  <TableRow label="إجمالي المبيعات" value={fmt(totalRevenue)} bold />
                  <TableRow label="المدفوع" value={fmt(summary.totalPaid || 0)} color="var(--accent-success)" />
                  <TableRow label="المتبقي" value={fmt(summary.totalBalance || 0)} color="var(--accent-warning)" />
                  <TableRow label="متوسط قيمة الطلب" value={fmt(summary.totalOrders > 0 ? totalRevenue / summary.totalOrders : 0)} />
                </tbody>
              </table>
            </div>

            {/* Expense Summary */}
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', margin: '0 0 12px' }}>ملخص المصروفات</h4>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {Object.entries(expenseByCategory)
                    .sort(([, a], [, b]) => b - a)
                    .map(([cat, amount]) => (
                      <TableRow
                        key={cat}
                        label={CATEGORY_LABELS[cat] || cat}
                        value={fmt(amount)}
                        color="var(--accent-danger)"
                      />
                    ))
                  }
                  <TableRow label="الإجمالي" value={fmt(totalExpenses)} bold color="var(--accent-danger)" />
                  <TableRow label="صافي الربح" value={fmt(netProfit)} bold color={netProfit >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)'} />
                  <TableRow label="هامش الربح" value={`${profitMargin.toFixed(1)}%`} bold color={profitMargin >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)'} />
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* === Expense Detail List === */}
        {expensesData.length > 0 && (
          <div style={{
            background: cardBg,
            border: `1px solid ${cardBorder}`,
            borderRadius: 14,
            overflow: 'hidden',
          }}>
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${cardBorder}` }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                تفاصيل المصروفات ({expensesData.length})
              </h3>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: theme === 'dark' ? '#161822' : '#f8f9fb' }}>
                  {['التاريخ', 'الفئة', 'الوصف', 'الفرع', 'المبلغ'].map(h => (
                    <th key={h} style={{
                      padding: '12px 16px',
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--text-muted)',
                      textAlign: 'right',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {expensesData.slice(0, 20).map((expense: any) => (
                  <tr key={expense.id} style={{ borderBottom: `1px solid ${cardBorder}` }}>
                    <td style={{ padding: '10px 16px', fontSize: 13, color: 'var(--text-secondary)' }}>
                      {new Date(expense.expense_date).toLocaleDateString('ar-SA')}
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 10px',
                        borderRadius: 20,
                        fontSize: 12,
                        fontWeight: 500,
                        background: 'var(--bg-tertiary)',
                        color: 'var(--text-secondary)',
                      }}>
                        {expense.category_name || CATEGORY_LABELS[expense.category] || expense.category}
                      </span>
                    </td>
                    <td style={{ padding: '10px 16px', fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>
                      {expense.description}
                    </td>
                    <td style={{ padding: '10px 16px', fontSize: 13, color: 'var(--text-secondary)' }}>
                      {expense.branch_id === 1 ? 'الميرة' : 'الشارع التجاري'}
                    </td>
                    <td style={{ padding: '10px 16px', fontSize: 14, fontWeight: 700, color: 'var(--accent-danger)' }}>
                      {fmt(expense.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}

function PLCard({ title, value, icon, subtitle, color, colorLight }: {
  title: string
  value: string
  icon: React.ReactNode
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
      {subtitle && (
        <p style={{ fontSize: 12, color, margin: '4px 0 0', fontWeight: 600 }}>{subtitle}</p>
      )}
    </div>
  )
}

function TableRow({ label, value, bold, color }: {
  label: string
  value: string
  bold?: boolean
  color?: string
}) {
  const borderColor = 'var(--border-secondary)'
  return (
    <tr style={{ borderBottom: `1px solid ${borderColor}` }}>
      <td style={{ padding: '10px 0', fontSize: 13, color: 'var(--text-secondary)' }}>{label}</td>
      <td style={{
        padding: '10px 0',
        fontSize: bold ? 15 : 13,
        fontWeight: bold ? 700 : 500,
        color: color || 'var(--text-primary)',
        textAlign: 'left',
      }}>
        {value}
      </td>
    </tr>
  )
}
