import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

  if (!supabaseUrl || supabaseUrl.includes('placeholder') || !supabaseKey || supabaseKey.includes('placeholder')) {
    return NextResponse.json(
      { error: 'Supabase not configured. Please add your credentials in .env.local' },
      { status: 500 }
    )
  }

  const { searchParams } = new URL(request.url)
  const branchId = searchParams.get('branch_id')

  // Fetch orders
  let ordersQuery = supabase
    .from('orders')
    .select('id, branch_id, price, paid, created_at, status, created_by, customer_id')
    .order('created_at', { ascending: false })

  if (branchId) {
    ordersQuery = ordersQuery.eq('branch_id', parseInt(branchId))
  }

  const { data: orders, error: ordersError } = await ordersQuery

  if (ordersError) {
    if (ordersError.code === '42P01') {
      return NextResponse.json({
        error: 'الجداول غير موجودة',
        details: 'الرجاء تشغيل supabase-setup.sql'
      }, { status: 500 })
    }
    return NextResponse.json({ error: ordersError.message }, { status: 500 })
  }

  // Fetch expenses
  let expensesQuery = supabase
    .from('expenses')
    .select('amount, category, expense_date, branch_id')
    .eq('is_deleted', 0)

  if (branchId) {
    expensesQuery = expensesQuery.eq('branch_id', parseInt(branchId))
  }

  const { data: expenses } = await expensesQuery

  // Fetch customers count
  const { count: customersCount } = await supabase
    .from('customers')
    .select('*', { count: 'exact', head: true })

  // Fetch branches
  const { data: branches } = await supabase
    .from('branches')
    .select('*')

  const branchMap: Record<number, string> = {}
  branches?.forEach((b: any) => { branchMap[b.id] = b.name })

  const allOrders = orders || []
  const allExpenses = expenses || []

  // Helper: metrics for a set of orders
  const calcMetrics = (orderList: any[]) => {
    const totalRevenue = orderList.reduce((s, o) => s + (o.price || 0), 0)
    const totalPaid = orderList.reduce((s, o) => s + (o.paid || 0), 0)
    const totalBalance = totalRevenue - totalPaid
    const completedOrders = orderList.filter(o => o.status === 'delivered').length
    const pendingOrders = orderList.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length
    const cancelledOrders = orderList.filter(o => o.status === 'cancelled').length
    const avgOrderValue = orderList.length > 0 ? totalRevenue / orderList.length : 0
    return { totalRevenue, totalPaid, totalBalance, completedOrders, pendingOrders, cancelledOrders, avgOrderValue, orderCount: orderList.length }
  }

  // Daily revenue for last 30 days
  const getDailyRevenue = (orderList: any[], days = 30) => {
    const now = new Date()
    const cutoff = new Date(now.getTime() - days * 86400000)
    const daily: Record<string, number> = {}
    // Fill missing days with 0
    for (let i = 0; i < days; i++) {
      const d = new Date(cutoff.getTime() + i * 86400000)
      const key = d.toISOString().split('T')[0]
      daily[key] = 0
    }
    orderList.forEach(o => {
      const date = new Date(o.created_at).toISOString().split('T')[0]
      if (daily[date] !== undefined) daily[date] += (o.price || 0)
    })
    return Object.entries(daily).map(([date, revenue]) => ({ date, revenue }))
  }

  // Monthly revenue for last 12 months
  const getMonthlyRevenue = (orderList: any[]) => {
    const monthly: Record<string, number> = {}
    const now = new Date()
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      monthly[key] = 0
    }
    orderList.forEach(o => {
      const d = new Date(o.created_at)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (monthly[key] !== undefined) monthly[key] += (o.price || 0)
    })
    return Object.entries(monthly).map(([month, revenue]) => ({ month, revenue }))
  }

  // Expense totals by category
  const expensesByCategory = allExpenses.reduce((acc: Record<string, number>, e: any) => {
    acc[e.category] = (acc[e.category] || 0) + (e.amount || 0)
    return acc
  }, {})

  const totalExpenses = allExpenses.reduce((s, e) => s + (e.amount || 0), 0)

  // Order status distribution
  const statusDist: Record<string, number> = {}
  allOrders.forEach(o => { statusDist[o.status] = (statusDist[o.status] || 0) + 1 })

  // Get unique branch IDs from orders
  const branchIds = [...new Set(allOrders.map(o => o.branch_id))].sort()

  // Per-branch metrics
  const branchMetrics: Record<string, any> = {}
  branchIds.forEach(id => {
    const bOrders = allOrders.filter(o => o.branch_id === id)
    const bExpenses = allExpenses.filter(e => e.branch_id === id)
    const bTotalExpenses = bExpenses.reduce((s, e) => s + (e.amount || 0), 0)
    const metrics = calcMetrics(bOrders)
    branchMetrics[id] = {
      name: branchMap[id] || `فرع ${id}`,
      ...metrics,
      totalExpenses: bTotalExpenses,
      netProfit: metrics.totalRevenue - bTotalExpenses,
      dailyRevenue: getDailyRevenue(bOrders),
    }
  })

  // Top customers by order value
  const customerRevenue: Record<string, { count: number; total: number }> = {}
  allOrders.forEach(o => {
    if (!o.customer_id) return
    if (!customerRevenue[o.customer_id]) customerRevenue[o.customer_id] = { count: 0, total: 0 }
    customerRevenue[o.customer_id].count++
    customerRevenue[o.customer_id].total += (o.price || 0)
  })

  // Fetch top 5 customer names
  const topCustomerIds = Object.entries(customerRevenue)
    .sort(([, a], [, b]) => b.total - a.total)
    .slice(0, 5)
    .map(([id]) => parseInt(id))

  let topCustomers: any[] = []
  if (topCustomerIds.length > 0) {
    const { data: customerData } = await supabase
      .from('customers')
      .select('id, name, phone')
      .in('id', topCustomerIds)
    topCustomers = (customerData || []).map((c: any) => ({
      ...c,
      orderCount: customerRevenue[c.id]?.count || 0,
      totalSpent: customerRevenue[c.id]?.total || 0,
    }))
  }

  // Recent orders (last 10)
  const recentOrders = allOrders.slice(0, 10)

  // Fetch customer names for recent orders
  let recentOrdersWithCustomer = recentOrders
  const recentCustomerIds = [...new Set(recentOrders.map(o => o.customer_id).filter(Boolean))]
  if (recentCustomerIds.length > 0) {
    const { data: rcData } = await supabase
      .from('customers')
      .select('id, name')
      .in('id', recentCustomerIds)
    const rcMap: Record<number, string> = {}
    rcData?.forEach((c: any) => { rcMap[c.id] = c.name })
    recentOrdersWithCustomer = recentOrders.map(o => ({ ...o, customer_name: rcMap[o.customer_id] || '—' }))
  }

  // This week vs last week comparison
  const now = new Date()
  const thisWeekStart = new Date(now)
  thisWeekStart.setDate(now.getDate() - now.getDay())
  const lastWeekStart = new Date(thisWeekStart)
  lastWeekStart.setDate(lastWeekStart.getDate() - 7)

  const thisWeekOrders = allOrders.filter(o => new Date(o.created_at) >= thisWeekStart)
  const lastWeekOrders = allOrders.filter(o => {
    const d = new Date(o.created_at)
    return d >= lastWeekStart && d < thisWeekStart
  })

  const thisWeekRevenue = thisWeekOrders.reduce((s, o) => s + (o.price || 0), 0)
  const lastWeekRevenue = lastWeekOrders.reduce((s, o) => s + (o.price || 0), 0)
  const revenueGrowth = lastWeekRevenue > 0 ? ((thisWeekRevenue - lastWeekRevenue) / lastWeekRevenue * 100) : 0

  const thisWeekExpenses = allExpenses
    .filter(e => new Date(e.expense_date) >= thisWeekStart)
    .reduce((s, e) => s + (e.amount || 0), 0)

  return NextResponse.json({
    summary: {
      totalRevenue: calcMetrics(allOrders).totalRevenue,
      totalOrders: allOrders.length,
      totalBalance: calcMetrics(allOrders).totalBalance,
      totalPaid: calcMetrics(allOrders).totalPaid,
      totalExpenses,
      netProfit: calcMetrics(allOrders).totalRevenue - totalExpenses,
      customersCount: customersCount || 0,
      thisWeekRevenue,
      lastWeekRevenue,
      revenueGrowth: Math.round(revenueGrowth * 10) / 10,
      thisWeekExpenses,
    },
    branches: branchMetrics,
    statusDistribution: statusDist,
    monthlyRevenue: getMonthlyRevenue(allOrders),
    dailyRevenue: getDailyRevenue(allOrders),
    expensesByCategory,
    topCustomers,
    recentOrders: recentOrdersWithCustomer,
  })
}
