// صفحة قائمة الطلبات
'use client'

import { useState, useEffect } from 'react'
import { Search, Filter } from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'
import { OrderCard } from '@/components/orders/OrderCard'
import { ORDER_STATUS_LABELS, type OrderStatus } from '@/types/order'

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [branchFilter, setBranchFilter] = useState<string>('all')

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (branchFilter !== 'all') params.append('branch_id', branchFilter)

      const res = await fetch(`/api/orders?${params}`)
      const json = await res.json()
      setOrders(json.orders || [])
    } catch (error) {
      console.error('Error fetching orders:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [statusFilter, branchFilter])

  const filteredOrders = orders.filter(order => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      order.order_number?.toLowerCase().includes(searchLower) ||
      order.customer?.name?.toLowerCase().includes(searchLower) ||
      order.customer?.phone?.includes(search)
    )
  })

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* الفلاتر والبحث */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* البحث */}
            <div className="flex-1 relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="بحث برقم الطلب، اسم العميل، أو الهاتف..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* فلتر الحالة */}
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">جميع الحالات</option>
                {Object.entries(ORDER_STATUS_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* فلتر الفرع */}
            <select
              value={branchFilter}
              onChange={e => setBranchFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">جميع الفروع</option>
              <option value="1">الميرة</option>
              <option value="2">الشارع التجاري</option>
            </select>
          </div>
        </div>

        {/* قائمة الطلبات */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl">
            <p className="text-gray-500">لا توجد طلبات</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map(order => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        )}

        {/* إحصائيات سريعة */}
        {!loading && filteredOrders.length > 0 && (
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
              <p className="text-sm text-gray-500">إجمالي الطلبات</p>
              <p className="text-2xl font-bold text-gray-900">{filteredOrders.length}</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
              <p className="text-sm text-gray-500">إجمالي القيمة</p>
              <p className="text-2xl font-bold text-gray-900">
                {filteredOrders.reduce((sum, o) => sum + o.price, 0).toLocaleString('ar-SA')} ر.س
              </p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
              <p className="text-sm text-gray-500">المدفوع</p>
              <p className="text-2xl font-bold text-green-600">
                {filteredOrders.reduce((sum, o) => sum + o.paid, 0).toLocaleString('ar-SA')} ر.س
              </p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
              <p className="text-sm text-gray-500">المتبقي</p>
              <p className="text-2xl font-bold text-orange-600">
                {filteredOrders.reduce((sum, o) => sum + (o.price - o.paid), 0).toLocaleString('ar-SA')} ر.س
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
