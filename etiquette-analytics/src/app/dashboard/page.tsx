'use client'

import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts'
import type { AnalyticsData } from '@/types/analytics'
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Loader2 } from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'

export default function DashboardPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // جلب بيانات التحليلات عند تحميل الصفحة
  useEffect(() => {
    fetchAnalytics()
  }, [])

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
    } catch (err) {
      setError('فشل تحميل البيانات. تأكد من إعداد Supabase بشكل صحيح.')
    } finally {
      setLoading(false)
    }
  }

  // حالة التحميل
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  // حالة خطأ في تحميل البيانات
  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <p className="text-red-600 text-lg mb-2">فشل تحميل البيانات</p>
          <p className="text-gray-600">{error || 'تأكد من إعداد Supabase بشكل صحيح في ملف .env.local'}</p>
        </div>
      </div>
    )
  }

  // تنسيق المبلغ بالعملة
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR' }).format(amount)
  }

  // بطاقة إحصائيات الفرع
  const BranchCard = ({ branch, id }: { branch: AnalyticsData['branches']['A'], id: 'A' | 'B' }) => (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">الفرع {id}</h2>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
          data.comparison.moreProfitable === id
            ? 'bg-green-100 text-green-800'
            : 'bg-gray-100 text-gray-800'
        }`}>
          {data.comparison.moreProfitable === id ? '🏆 الأكثر ربحية' : 'الفرع ' + id}
        </span>
      </div>
      <p className="text-gray-600 mb-4">{branch.name}</p>

      <div className="grid grid-cols-2 gap-4">
        <MetricCard
          title="إجمالي الإيرادات"
          value={formatCurrency(branch.totalRevenue)}
          icon={<DollarSign className="w-5 h-5" />}
          trend={id === 'A' ? (data.comparison.revenueDifference > 0 ? 'up' : 'down') : (data.comparison.revenueDifference < 0 ? 'up' : 'down')}
        />
        <MetricCard
          title="إجمالي الطلبات"
          value={branch.orderCount.toString()}
          icon={<ShoppingCart className="w-5 h-5" />}
        />
        <MetricCard
          title="مكتملة"
          value={branch.completedOrders.toString()}
        />
        <MetricCard
          title="قيد التنفيذ"
          value={branch.pendingOrders.toString()}
        />
        <MetricCard
          title="مدفوع"
          value={formatCurrency(branch.totalPaid)}
        />
        <MetricCard
          title="متبقي"
          value={formatCurrency(branch.totalBalance)}
        />
      </div>

      <div className="mt-4 pt-4 border-t">
        <p className="text-sm text-gray-600">
          متوسط قيمة الطلب: <span className="font-semibold">{formatCurrency(branch.avgOrderValue)}</span>
        </p>
      </div>
    </div>
  )

  // بطاقة مقياس صغير
  const MetricCard = ({ title, value, icon, trend }: { title: string; value: string; icon?: React.ReactNode; trend?: 'up' | 'down' }) => (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-1">
        {icon && <span className="text-gray-500">{icon}</span>}
        <p className="text-xs text-gray-600">{title}</p>
      </div>
      <div className="flex items-center gap-2">
        <p className="text-lg font-bold">{value}</p>
        {trend === 'up' && <TrendingUp className="w-4 h-4 text-green-500" />}
        {trend === 'down' && <TrendingDown className="w-4 h-4 text-red-500" />}
      </div>
    </div>
  )

  // دمج الإيرادات اليومية للرسم البياني
  const dailyData = data.branches.A.dailyRevenue.map((item, i) => ({
    date: new Date(item.date).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' }),
    'الفرع A': item.revenue,
    'الفرع B': data.branches.B.dailyRevenue[i]?.revenue || 0,
  }))

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* بطاقات الملخص */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-gray-600 text-sm mb-2">إجمالي الإيرادات (كلا الفرعين)</h3>
            <p className="text-3xl font-bold text-gray-900">{formatCurrency(data.summary.totalRevenue)}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-gray-600 text-sm mb-2">إجمالي الطلبات</h3>
            <p className="text-3xl font-bold text-gray-900">{data.summary.totalOrders}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-gray-600 text-sm mb-2">إجمالي المتبقي</h3>
            <p className="text-3xl font-bold text-orange-600">{formatCurrency(data.summary.totalBalance)}</p>
          </div>
        </div>

        {/* مقارنة الفروع */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <BranchCard branch={data.branches.A} id="A" />
          <BranchCard branch={data.branches.B} id="B" />
        </div>

        {/* الرسوم البيانية */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-bold mb-4">مقارنة الإيرادات عبر الزمن</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Legend />
              <Line type="monotone" dataKey="الفرع A" stroke="#3b82f6" strokeWidth={2} />
              <Line type="monotone" dataKey="الفرع B" stroke="#10b981" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mt-6">
          <h3 className="text-lg font-bold mb-4">مقارنة الطلبات</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={[
              { name: 'الفرع A', orders: data.branches.A.orderCount, completed: data.branches.A.completedOrders, pending: data.branches.A.pendingOrders },
              { name: 'الفرع B', orders: data.branches.B.orderCount, completed: data.branches.B.completedOrders, pending: data.branches.B.pendingOrders },
            ]}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="completed" fill="#10b981" name="مكتملة" />
              <Bar dataKey="pending" fill="#f59e0b" name="قيد التنفيذ" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mt-6">
          <h3 className="text-lg font-bold mb-4">الإيرادات حسب الفرع</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={[
              { name: 'الفرع A', revenue: data.branches.A.totalRevenue },
              { name: 'الفرع B', revenue: data.branches.B.totalRevenue },
            ]}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Bar dataKey="revenue" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </main>
    </div>
  )
}
