// صفحة التقارير المالية
'use client'

import { useState, useEffect } from 'react'
import { TrendingDown, TrendingUp, DollarSign, Calendar } from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'

export default function ReportsPage() {
  const [data, setData] = useState({
    totalRevenue: 0,
    totalPaid: 0,
    totalBalance: 0,
    totalExpenses: 0,
    netProfit: 0,
    ordersCount: 0,
  })
  const [loading, setLoading] = useState(true)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  useEffect(() => {
    // تعيين التواريخ الافتراضية (هذا الشهر)
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    setStartDate(firstDay.toISOString().split('T')[0])
    setEndDate(lastDay.toISOString().split('T')[0])
  }, [])

  useEffect(() => {
    if (startDate && endDate) {
      fetchReport()
    }
  }, [startDate, endDate])

  const fetchReport = async () => {
    setLoading(true)
    try {
      // جلب بيانات الطلبات
      const ordersRes = await fetch(`/api/analytics`)
      const ordersJson = await ordersRes.json()

      // جلب بيانات المصروفات
      const expensesRes = await fetch(`/api/expenses?start_date=${startDate}&end_date=${endDate}`)
      const expensesJson = await expensesRes.json()

      const totalRevenue = ordersJson.summary?.totalRevenue || 0
      const totalPaid = ordersJson.summary?.totalPaid || 0
      const totalBalance = ordersJson.summary?.totalBalance || 0
      const totalExpenses = (expensesJson.expenses || []).reduce((sum: number, e: any) => sum + e.amount, 0)

      setData({
        totalRevenue,
        totalPaid,
        totalBalance,
        totalExpenses,
        netProfit: totalRevenue - totalExpenses,
        ordersCount: ordersJson.summary?.totalOrders || 0,
      })
    } catch (error) {
      console.error('Error fetching report:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">التقارير المالية</h1>
        </div>

        {/* فلترة التاريخ */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex flex-col md:flex-row items-end gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">من تاريخ</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">إلى تاريخ</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* بطاقات الملخص */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="إجمالي الإيرادات"
            value={`${data.totalRevenue.toLocaleString('ar-SA')} ر.س`}
            icon={<DollarSign className="w-5 h-5" />}
            trend={data.totalRevenue > 0 ? 'up' : 'neutral'}
            color="blue"
          />

          <MetricCard
            title="المصروفات"
            value={`${data.totalExpenses.toLocaleString('ar-SA')} ر.س`}
            icon={<TrendingDown className="w-5 h-5" />}
            trend={data.totalExpenses > 0 ? 'down' : 'neutral'}
            color="red"
          />

          <MetricCard
            title="صافي الربح"
            value={`${data.netProfit.toLocaleString('ar-SA')} ر.س`}
            icon={<TrendingUp className="w-5 h-5" />}
            trend={data.netProfit > 0 ? 'up' : data.netProfit < 0 ? 'down' : 'neutral'}
            color={data.netProfit >= 0 ? 'green' : 'red'}
          />

          <MetricCard
            title="الديون المتبقية"
            value={`${data.totalBalance.toLocaleString('ar-SA')} ر.س`}
            icon={<Calendar className="w-5 h-5" />}
            trend={data.totalBalance > 0 ? 'neutral' : 'up'}
            color="orange"
          />
        </div>

        {/* تفاصيل إضافية */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* ملخص الإيرادات */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">ملخص الإيرادات</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">إجمالي الطلبات</span>
                <span className="font-bold">{data.ordersCount}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">إجمالي المبيعات</span>
                <span className="font-bold">{data.totalRevenue.toLocaleString('ar-SA')} ر.س</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">المدفوع</span>
                <span className="font-bold text-green-600">{data.totalPaid.toLocaleString('ar-SA')} ر.س</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600">المتبقي</span>
                <span className="font-bold text-orange-600">{data.totalBalance.toLocaleString('ar-SA')} ر.س</span>
              </div>
            </div>
          </div>

          {/* ملخص المصروفات */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">ملخص المصروفات</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600">إجمالي المصروفات</span>
                <span className="font-bold text-red-600">{data.totalExpenses.toLocaleString('ar-SA')} ر.س</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600">صافي الربح</span>
                <span className={`font-bold ${data.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {data.netProfit.toLocaleString('ar-SA')} ر.س
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600">نسبة الربح</span>
                <span className={`font-bold ${data.totalRevenue > 0 && (data.netProfit / data.totalRevenue * 100) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {data.totalRevenue > 0 ? ((data.netProfit / data.totalRevenue) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* أزرار التنقل */}
        <div className="mt-6 flex gap-3">
          <button
            onClick={() => window.open('/payments', '_blank')}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            عرض المدفوعات
          </button>
          <button
            onClick={() => window.open('/expenses', '_blank')}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            عرض المصروفات
          </button>
        </div>
      </div>
    </div>
  )
}

function MetricCard({
  title,
  value,
  icon,
  trend,
  color,
}: {
  title: string
  value: string
  icon?: React.ReactNode
  trend?: 'up' | 'down' | 'neutral'
  color?: 'blue' | 'green' | 'red' | 'orange'
}) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    red: 'bg-red-50 text-red-700',
    orange: 'bg-orange-50 text-orange-700',
  }

  const trendColors: Record<string, string> = {
    up: 'text-green-500',
    down: 'text-red-500',
    neutral: 'text-gray-400',
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-gray-500">{title}</p>
        {icon && <span className={colorClasses[color || 'blue']}>{icon}</span>}
      </div>
      <p className="text-2xl font-bold text-gray-900 mb-1">{value}</p>
      {trend && trend !== 'neutral' && (
        <div className={`flex items-center text-sm ${trendColors[trend]}`}>
          {trend === 'up' && <TrendingUp className="w-4 h-4 ml-1" />}
          {trend === 'down' && <TrendingDown className="w-4 h-4 ml-1" />}
        </div>
      )}
    </div>
  )
}
