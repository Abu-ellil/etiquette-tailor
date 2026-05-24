'use client'

import { useState, useEffect } from 'react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { useChartColors, ChartTooltip, ChartContainer } from '@/components/charts/ChartProvider'
import { AppShell } from '@/components/layout/AppShell'
import {
  TrendingUp, TrendingDown, DollarSign, Calendar,
  Loader2, Filter, Activity, ChevronDown,
} from 'lucide-react'

const CATEGORY_LABELS: Record<string, string> = {
  rent: 'إيجار', utilities: 'مرافق', materials: 'مواد', fabric: 'أقمشة',
  supplies: 'مستلزمات', salaries: 'رواتب', other: 'أخرى',
}

const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899']

const PERIOD_LABELS: Record<string, string> = {
  week: 'أسبوع', month: 'شهر', quarter: 'ربع سنة', year: 'سنة', all: 'الكل',
}

type Period = 'week' | 'month' | 'quarter' | 'year' | 'all'

export default function ReportsPage() {
  const chartColors = useChartColors()
  const [analyticsData, setAnalyticsData] = useState<any>(null)
  const [expensesData, setExpensesData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<Period>('month')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [branchId, setBranchId] = useState<string>('')
  const [branches, setBranches] = useState<{ id: number; name: string }[]>([])
  const [expandedBranch, setExpandedBranch] = useState<string | null>(null)

  useEffect(() => {
    const now = new Date()
    let start: Date
    switch (period) {
      case 'week': start = new Date(now.getTime() - 7 * 86400000); break
      case 'month': start = new Date(now.getFullYear(), now.getMonth(), 1); break
      case 'quarter': start = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1); break
      case 'year': start = new Date(now.getFullYear(), 0, 1); break
      case 'all': start = new Date(2020, 0, 1); break
    }
    setStartDate(start.toISOString().split('T')[0])
    setEndDate(now.toISOString().split('T')[0])
  }, [period])

  useEffect(() => {
    if (startDate && endDate) fetchData()
  }, [startDate, endDate, branchId])

  const fetchData = async () => {
    setLoading(true)
    try {
      const branchParam = branchId ? `&branch_id=${branchId}` : ''
      const [analyticsRes, expensesRes] = await Promise.all([
        fetch(`/api/analytics${branchId ? `?branch_id=${branchId}` : ''}`),
        fetch(`/api/expenses?start_date=${startDate}&end_date=${endDate}${branchParam}`),
      ])
      const analytics = await analyticsRes.json()
      const expensesJson = await expensesRes.json()
      setAnalyticsData(analytics)

      // Populate branches list from analytics data
      if (analytics.branches) {
        const branchList = Object.entries(analytics.branches).map(([id, b]: [string, any]) => ({
          id: parseInt(id),
          name: b.name,
        }))
        if (branchList.length > 0 && branches.length === 0) setBranches(branchList)
      }

      setExpensesData(expensesJson.expenses || [])
    } catch (e) {
      console.error('Error fetching reports:', e)
    } finally {
      setLoading(false)
    }
  }

  const fmt = (amount: number) => new Intl.NumberFormat('ar-QA', { style: 'currency', currency: 'QAR', maximumFractionDigits: 0 }).format(amount)
  const fmtN = (n: number) => n.toLocaleString('ar-QA')

  if (loading || !analyticsData) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-10 h-10 animate-spin text-accent-primary" />
        </div>
      </AppShell>
    )
  }

  const summary = analyticsData.summary || {}
  const branchesData = analyticsData.branches || {}
  const monthlyRevenue = analyticsData.monthlyRevenue || []

  const totalExpenses = expensesData.reduce((s, e) => s + (e.amount || 0), 0)
  const totalRevenue = summary.totalRevenue || 0
  const netProfit = totalRevenue - totalExpenses
  const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100) : 0

  const expenseByCategory = expensesData.reduce((acc: Record<string, number>, e: any) => {
    acc[e.category] = (acc[e.category] || 0) + (e.amount || 0)
    return acc
  }, {})
  const expenseChartData = Object.entries(expenseByCategory).map(([cat, amount]) => ({
    name: CATEGORY_LABELS[cat] || cat,
    value: amount,
  }))

  const revenueVsExpense = monthlyRevenue.map((m: { month: string; revenue: number }) => {
    const monthExpenses = expensesData
      .filter((e: any) => new Date(e.expense_date).toISOString().startsWith(m.month))
      .reduce((s: number, e: any) => s + (e.amount || 0), 0)
    return {
      month: new Date(m.month + '-01').toLocaleDateString('ar-QA', { month: 'short' }),
      الإيرادات: m.revenue,
      المصروفات: monthExpenses,
      'صافي الربح': m.revenue - monthExpenses,
    }
  })

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
      date: new Date(date).toLocaleDateString('ar-QA', { month: 'short', day: 'numeric' }),
      'الإيرادات': v.inflow,
      'المصروفات': v.outflow,
      'صافي': v.inflow - v.outflow,
    }))

  return (
    <AppShell>
      {/* Header */}
      <div className="flex justify-between items-center mb-6 md:mb-7">
        <div>
          <h1 className="page-title">التقارير المالية</h1>
          <p className="page-subtitle">تحليل شامل للإيرادات والمصروفات والأرباح</p>
        </div>
      </div>

      {/* Period Filter */}
      <div className="filter-bar">
        <Filter size={18} style={{ color: 'var(--text-muted)' }} />
        <select
          value={branchId}
          onChange={e => setBranchId(e.target.value)}
          className="date-input"
          style={{ minWidth: 130, cursor: 'pointer' }}
        >
          <option value="">جميع الفروع</option>
          {branches.map(b => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
        {(['week', 'month', 'quarter', 'year', 'all'] as Period[]).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`filter-btn ${period === p ? 'active' : ''}`}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
        <div className="flex items-center gap-2 mr-3">
          <input
            type="date"
            value={startDate}
            onChange={e => { setStartDate(e.target.value); setPeriod('all' as Period) }}
            className="date-input"
          />
          <span className="text-text-muted">—</span>
          <input
            type="date"
            value={endDate}
            onChange={e => { setEndDate(e.target.value); setPeriod('all' as Period) }}
            className="date-input"
          />
        </div>
      </div>

      {/* P&L Summary Cards */}
      <div className="kpi-grid gap-mb-mobile">
        <div className="kpi-card">
          <div className="flex items-center justify-between mb-2">
            <p className="kpi-title">إجمالي الإيرادات</p>
            <div className="kpi-icon" style={{ background: 'var(--accent-primary-light)' }}>
              <TrendingUp style={{ width: 16, height: 16, color: 'var(--accent-primary)' }} />
            </div>
          </div>
          <p className="kpi-value">{fmt(totalRevenue)}</p>
        </div>

        <div className="kpi-card">
          <div className="flex items-center justify-between mb-2">
            <p className="kpi-title">إجمالي المصروفات</p>
            <div className="kpi-icon" style={{ background: 'var(--accent-danger-light)' }}>
              <TrendingDown style={{ width: 16, height: 16, color: 'var(--accent-danger)' }} />
            </div>
          </div>
          <p className="kpi-value">{fmt(totalExpenses)}</p>
        </div>

        <div className="kpi-card">
          <div className="flex items-center justify-between mb-2">
            <p className="kpi-title">صافي الربح</p>
            <div className="kpi-icon" style={{ background: netProfit >= 0 ? 'var(--accent-success-light)' : 'var(--accent-danger-light)' }}>
              <DollarSign style={{ width: 16, height: 16, color: netProfit >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)' }} />
            </div>
          </div>
          <p className="kpi-value">{fmt(netProfit)}</p>
          <p style={{ fontSize: 12, color: netProfit >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)', marginTop: 4, fontWeight: 600 }}>
            {netProfit >= 0 ? 'ربح' : 'خسارة'}
          </p>
        </div>

        <div className="kpi-card">
          <div className="flex items-center justify-between mb-2">
            <p className="kpi-title">هامش الربح</p>
            <div className="kpi-icon" style={{
              background: profitMargin >= 20 ? 'var(--accent-success-light)' : profitMargin >= 0 ? 'var(--accent-warning-light)' : 'var(--accent-danger-light)',
            }}>
              <Activity style={{ width: 16, height: 16, color: profitMargin >= 20 ? 'var(--accent-success)' : profitMargin >= 0 ? 'var(--accent-warning)' : 'var(--accent-danger)' }} />
            </div>
          </div>
          <p className="kpi-value">{profitMargin.toFixed(1)}%</p>
          <p style={{ fontSize: 12, color: profitMargin >= 20 ? 'var(--accent-success)' : profitMargin >= 0 ? 'var(--accent-warning)' : 'var(--accent-danger)', marginTop: 4, fontWeight: 600 }}>
            {profitMargin >= 20 ? 'ممتاز' : profitMargin >= 10 ? 'جيد' : profitMargin >= 0 ? 'مقبول' : 'خسارة'}
          </p>
        </div>

        <div className="kpi-card">
          <div className="flex items-center justify-between mb-2">
            <p className="kpi-title">الديون المتبقية</p>
            <div className="kpi-icon" style={{ background: 'var(--accent-warning-light)' }}>
              <Calendar style={{ width: 16, height: 16, color: 'var(--accent-warning)' }} />
            </div>
          </div>
          <p className="kpi-value">{fmt(summary.totalBalance || 0)}</p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>من العملاء</p>
        </div>
      </div>

      {/* Revenue vs Expenses Trend + Expense Pie */}
      <div className="chart-row-2 gap-mb-mobile">
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
            <Tooltip content={<ChartTooltip formatter={(v) => fmt(v ?? 0)} />} />
            <Legend iconType="circle" iconSize={8} formatter={(v: string) => <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{v}</span>} />
            <Bar dataKey="الإيرادات" fill={chartColors.colors[0]} radius={[4, 4, 0, 0]} />
            <Bar dataKey="المصروفات" fill={chartColors.colors[3]} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>

        <ChartContainer title="توزيع المصروفات" subtitle={fmt(totalExpenses)}>
          {expenseChartData.length > 0 ? (
            <PieChart>
              <Pie data={expenseChartData} cx="50%" cy="50%" outerRadius={95} innerRadius={50} paddingAngle={3} dataKey="value" nameKey="name">
                {expenseChartData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip formatter={(v) => fmt(v ?? 0)} />} />
              <Legend verticalAlign="bottom" iconType="circle" iconSize={8} formatter={(v: string) => <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{v}</span>} />
            </PieChart>
          ) : (
            <div className="flex items-center justify-center h-full text-text-muted">
              لا توجد مصروفات في هذه الفترة
            </div>
          )}
        </ChartContainer>
      </div>

      {/* Cash Flow + Branch P&L */}
      <div className="equal-row gap-mb-mobile">
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
            <Tooltip content={<ChartTooltip formatter={(v) => fmt(v ?? 0)} />} />
            <Area type="monotone" dataKey="الإيرادات" stroke={chartColors.colors[1]} strokeWidth={2} fill="url(#inflowGrad)" />
            <Area type="monotone" dataKey="المصروفات" stroke={chartColors.colors[3]} strokeWidth={2} fill="url(#outflowGrad)" />
          </AreaChart>
        </ChartContainer>

        {!branchId && (
        <div className="card">
          <h3 className="section-title mb-5">تفاصيل الفروع</h3>
          {Object.entries(branchesData).map(([id, b]: [string, any], i) => {
            const bExpenses = expensesData.filter(e => e.branch_id === parseInt(id)).reduce((s, e) => s + (e.amount || 0), 0)
            const profit = b.totalRevenue - bExpenses
            const margin = b.totalRevenue > 0 ? (profit / b.totalRevenue * 100) : 0
            const isExpanded = expandedBranch === id

            const bExpensesByCat = expensesData
              .filter(e => e.branch_id === parseInt(id))
              .reduce((acc: Record<string, number>, e: any) => {
                acc[e.category] = (acc[e.category] || 0) + (e.amount || 0)
                return acc
              }, {})

            return (
              <div key={id} className="branch-card-inner" style={{ marginBottom: i < Object.keys(branchesData).length - 1 ? 12 : 0 }}>
                {/* Header - clickable */}
                <div
                  onClick={() => setExpandedBranch(isExpanded ? null : id)}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                >
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                      <ChevronDown
                        size={18}
                        style={{
                          color: 'var(--text-muted)',
                          transition: 'transform 0.2s ease',
                          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                        }}
                      />
                      <div>
                        <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{b.name}</p>
                        <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>{b.orderCount} طلب</p>
                      </div>
                    </div>
                    <div className="text-left">
                      <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: profit >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
                        {fmt(profit)}
                      </p>
                      <p style={{ margin: '2px 0 0', fontSize: 12, fontWeight: 600, color: margin >= 20 ? 'var(--accent-success)' : margin >= 0 ? 'var(--accent-warning)' : 'var(--accent-danger)' }}>
                        هامش {margin.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  <div className="profit-bar-track">
                    <div style={{
                      height: '100%',
                      width: `${Math.min(Math.max(Math.abs(margin), 0), 100)}%`,
                      borderRadius: 3,
                      background: margin >= 20 ? 'var(--accent-success)' : margin >= 0 ? 'var(--accent-warning)' : 'var(--accent-danger)',
                      transition: 'width 0.5s ease',
                    }} />
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-primary)' }}>
                    {/* KPIs */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div>
                        <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>الإيرادات</p>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--accent-primary)' }}>{fmt(b.totalRevenue)}</p>
                      </div>
                      <div>
                        <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>المصروفات</p>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--accent-danger)' }}>{fmt(bExpenses)}</p>
                      </div>
                      <div>
                        <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>صافي الربح</p>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: profit >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)' }}>{fmt(profit)}</p>
                      </div>
                      <div>
                        <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>الطلبات المكتملة</p>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{fmtN(b.completedOrders || 0)}</p>
                      </div>
                      <div>
                        <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>الطلبات المعلقة</p>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--accent-warning)' }}>{fmtN(b.pendingOrders || 0)}</p>
                      </div>
                      <div>
                        <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>متوسط قيمة الطلب</p>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{fmt(b.avgOrderValue || 0)}</p>
                      </div>
                    </div>

                    {/* Remaining balance */}
                    {(b.totalBalance > 0) && (
                      <div style={{ background: 'var(--accent-warning-light)', borderRadius: 8, padding: '8px 12px', marginBottom: 12 }}>
                        <p style={{ margin: 0, fontSize: 12, color: 'var(--accent-warning)', fontWeight: 600 }}>
                          الديون المتبقية: {fmt(b.totalBalance)}
                        </p>
                      </div>
                    )}

                    {/* Expense breakdown by category */}
                    {Object.keys(bExpensesByCat).length > 0 && (
                      <div>
                        <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>المصروفات حسب الفئة</p>
                        {Object.entries(bExpensesByCat)
                          .sort(([, a], [, b]) => (b as number) - (a as number))
                          .map(([cat, amount]) => {
                            const pct = bExpenses > 0 ? ((amount as number) / bExpenses * 100) : 0
                            return (
                              <div key={cat} style={{ marginBottom: 8 }}>
                                <div className="flex justify-between items-center" style={{ marginBottom: 4 }}>
                                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{CATEGORY_LABELS[cat] || cat}</span>
                                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{fmt(amount as number)} ({pct.toFixed(0)}%)</span>
                                </div>
                                <div className="profit-bar-track">
                                  <div style={{
                                    height: '100%',
                                    width: `${pct}%`,
                                    borderRadius: 3,
                                    background: PIE_COLORS[Object.keys(CATEGORY_LABELS).indexOf(cat) % PIE_COLORS.length],
                                    transition: 'width 0.4s ease',
                                  }} />
                                </div>
                              </div>
                            )
                          })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
        )}
      </div>

      {/* Revenue Breakdown Table */}
      <div className="card gap-mb-mobile">
        <h3 className="section-title mb-5">ملخص الأداء المالي</h3>
        <div className="summary-cols">
          <div>
            <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', margin: '0 0 12px' }}>ملخص الإيرادات</h4>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <DataRow label="إجمالي الطلبات" value={fmtN(summary.totalOrders || 0)} />
                <DataRow label="إجمالي المبيعات" value={fmt(totalRevenue)} bold />
                <DataRow label="المدفوع" value={fmt(summary.totalPaid || 0)} color="var(--accent-success)" />
                <DataRow label="المتبقي" value={fmt(summary.totalBalance || 0)} color="var(--accent-warning)" />
                <DataRow label="متوسط قيمة الطلب" value={fmt(summary.totalOrders > 0 ? totalRevenue / summary.totalOrders : 0)} />
              </tbody>
            </table>
          </div>
          <div>
            <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', margin: '0 0 12px' }}>ملخص المصروفات</h4>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {Object.entries(expenseByCategory)
                  .sort(([, a], [, b]) => (b as number) - (a as number))
                  .map(([cat, amount]) => (
                    <DataRow key={cat} label={CATEGORY_LABELS[cat] || cat} value={fmt(amount as number)} color="var(--accent-danger)" />
                  ))
                }
                <DataRow label="الإجمالي" value={fmt(totalExpenses)} bold color="var(--accent-danger)" />
                <DataRow label="صافي الربح" value={fmt(netProfit)} bold color={netProfit >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)'} />
                <DataRow label="هامش الربح" value={`${profitMargin.toFixed(1)}%`} bold color={profitMargin >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)'} />
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Expense Detail List */}
      {expensesData.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="section-header">
            <h3 className="section-title">تفاصيل المصروفات ({expensesData.length})</h3>
          </div>
          <div className="table-scroll">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-tertiary)' }}>
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
                  <tr key={expense.id} className="data-row">
                    <td style={{ padding: '10px 16px', fontSize: 13, color: 'var(--text-secondary)' }}>
                      {new Date(expense.expense_date).toLocaleDateString('ar-QA')}
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <span className="status-badge" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
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
        </div>
      )}
    </AppShell>
  )
}

function DataRow({ label, value, bold, color }: {
  label: string
  value: string
  bold?: boolean
  color?: string
}) {
  return (
    <tr className="data-row">
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
