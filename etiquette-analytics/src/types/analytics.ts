export interface BranchMetrics {
  name: string
  totalRevenue: number
  totalPaid: number
  totalBalance: number
  completedOrders: number
  pendingOrders: number
  avgOrderValue: number
  orderCount: number
  dailyRevenue: { date: string; revenue: number }[]
}

export interface AnalyticsData {
  branches: {
    A: BranchMetrics
    B: BranchMetrics
  }
  comparison: {
    revenueDifference: number
    ordersDifference: number
    moreProfitable: 'A' | 'B'
  }
  summary: {
    totalRevenue: number
    totalOrders: number
    totalBalance: number
  }
}
