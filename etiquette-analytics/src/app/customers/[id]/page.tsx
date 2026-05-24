// صفحة تفاصيل العميل
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowRight, Pencil, Trash2, ShoppingCart, Phone, FileText } from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/types/order'

export default function CustomerDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [customer, setCustomer] = useState<any>(null)
  const [orders, setOrders] = useState<any[]>([])
  const [totalBalance, setTotalBalance] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCustomer()
  }, [params.id])

  const fetchCustomer = async () => {
    try {
      const res = await fetch(`/api/customers/${params.id}`)
      const json = await res.json()
      setCustomer(json.customer)
      setOrders(json.orders || [])
      setTotalBalance(json.totalBalance || 0)
    } catch (error) {
      console.error('Error fetching customer:', error)
    } finally {
      setLoading(false)
    }
  }

  const deleteCustomer = async () => {
    if (!confirm('هل أنت متأكد من حذف هذا العميل؟')) return

    try {
      const res = await fetch(`/api/customers/${params.id}`, { method: 'DELETE' })
      if (res.ok) {
        router.push('/customers')
      }
    } catch (error) {
      console.error('Error deleting customer:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">العميل غير موجود</p>
      </div>
    )
  }

  const branchNames: Record<number, string> = {
    1: 'الميرة',
    2: 'الشارع التجاري',
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowRight className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{customer.name}</h1>
              <p className="text-sm text-gray-500">عميل منذ {new Date(customer.created_at).toLocaleDateString('ar-SA')}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push(`/orders/new?customer_id=${customer.id}`)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <ShoppingCart className="w-4 h-4" />
              طلب جديد
            </button>
            <button
              onClick={() => router.push(`/customers/${customer.id}/edit`)}
              className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              <Pencil className="w-4 h-4" />
              تعديل
            </button>
            <button
              onClick={deleteCustomer}
              className="flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
            >
              <Trash2 className="w-4 h-4" />
              حذف
            </button>
          </div>
        </div>

        {/* معلومات العميل */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* بطاقة المعلومات */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">معلومات الاتصال</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">رقم الهاتف</p>
                  <p className="font-medium" dir="ltr">{customer.phone}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">الفرع</p>
                <p className="font-medium text-gray-900">{branchNames[customer.branch_id] || customer.branch_id}</p>
              </div>
              {customer.notes && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">ملاحظات</p>
                  <p className="text-sm text-gray-700">{customer.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* بطاقة الملخص المالي */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">الملخص المالي</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">إجمالي الطلبات</p>
                <p className="text-2xl font-bold text-gray-900">{orders.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">الرصيد المتبقي</p>
                <p className={`text-2xl font-bold ${totalBalance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                  {totalBalance.toLocaleString('ar-SA')} ر.س
                </p>
              </div>
            </div>
          </div>

          {/* بطاقة إحصائيات سريعة */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">حالة الطلبات</h2>
            <div className="space-y-2">
              {Object.entries(ORDER_STATUS_LABELS).map(([key, label]) => {
                const count = orders.filter((o: any) => o.status === key).length
                if (count === 0) return null
                return (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{label}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                )
              })}
              {orders.length === 0 && (
                <p className="text-sm text-gray-500">لا توجد طلبات</p>
              )}
            </div>
          </div>
        </div>

        {/* سجل الطلبات */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">سجل الطلبات</h2>

          {orders.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">لا توجد طلبات لهذا العميل</p>
              <button
                onClick={() => router.push(`/orders/new?customer_id=${customer.id}`)}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                إنشاء طلب جديد
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-right py-3 text-sm font-medium text-gray-500">رقم الطلب</th>
                    <th className="text-right py-3 text-sm font-medium text-gray-500">التاريخ</th>
                    <th className="text-center py-3 text-sm font-medium text-gray-500">الحالة</th>
                    <th className="text-left py-3 text-sm font-medium text-gray-500">السعر</th>
                    <th className="text-left py-3 text-sm font-medium text-gray-500">المدفوع</th>
                    <th className="text-left py-3 text-sm font-medium text-gray-500">المتبقي</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order: any) => {
                    const balance = order.price - order.paid
                    return (
                      <tr
                        key={order.id}
                        onClick={() => router.push(`/orders/${order.id}`)}
                        className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                      >
                        <td className="py-3 font-medium">#{order.order_number}</td>
                        <td className="py-3 text-gray-600">
                          {new Date(order.created_at).toLocaleDateString('ar-SA')}
                        </td>
                        <td className="py-3 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${ORDER_STATUS_COLORS[order.status as keyof typeof ORDER_STATUS_COLORS]}`}>
                            {ORDER_STATUS_LABELS[order.status as keyof typeof ORDER_STATUS_LABELS]}
                          </span>
                        </td>
                        <td className="py-3">{order.price} ر.س</td>
                        <td className="py-3 text-green-600">{order.paid} ر.س</td>
                        <td className={`py-3 ${balance > 0 ? 'text-orange-600' : ''}`}>
                          {balance} ر.س
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
