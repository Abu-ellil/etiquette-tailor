export interface BranchMetrics {
  name: string
  totalRevenue: number
  totalPaid: number
  totalBalance: number
  completedOrders: number
  pendingOrders: number
  cancelledOrders: number
  avgOrderValue: number
  orderCount: number
  totalExpenses: number
  netProfit: number
  dailyRevenue: { date: string; revenue: number }[]
}

export interface TopCustomer {
  id: number
  name: string
  phone: string
  orderCount: number
  totalSpent: number
}

export interface RecentOrder {
  id: number
  order_number?: string
  branch_id: number
  price: number
  paid: number
  status: string
  created_at: string
  customer_name: string
}

export interface AnalyticsData {
  summary: {
    totalRevenue: number
    totalOrders: number
    totalBalance: number
    totalPaid: number
    totalExpenses: number
    netProfit: number
    customersCount: number
    thisWeekRevenue: number
    lastWeekRevenue: number
    revenueGrowth: number
    thisWeekExpenses: number
  }
  branches: Record<string, BranchMetrics>
  statusDistribution: Record<string, number>
  monthlyRevenue: { month: string; revenue: number }[]
  dailyRevenue: { date: string; revenue: number }[]
  expensesByCategory: Record<string, number>
  topCustomers: TopCustomer[]
  recentOrders: RecentOrder[]
}
