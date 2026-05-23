// صفحة تفاصيل الطلب
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowRight, Pencil, Trash2, Plus, CreditCard } from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'
import { StatusTimeline } from '@/components/orders/StatusTimeline'
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, type OrderStatus } from '@/types/order'

export default function OrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    fetchOrder()
  }, [params.id])

  const fetchOrder = async () => {
    try {
      const res = await fetch(`/api/orders/${params.id}`)
      const json = await res.json()
      setOrder(json.order)
    } catch (error) {
      console.error('Error fetching order:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (status: OrderStatus) => {
    try {
      const res = await fetch(`/api/orders/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })

      if (res.ok) {
        fetchOrder()
      }
    } catch (error) {
      console.error('Error updating status:', error)
    }
  }

  const deleteOrder = async () => {
    if (!confirm('هل أنت متأكد من حذف هذا الطلب؟')) return

    try {
      const res = await fetch(`/api/orders/${params.id}`, { method: 'DELETE' })
      if (res.ok) {
        router.push('/orders')
      }
    } catch (error) {
      console.error('Error deleting order:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">الطلب غير موجود</p>
      </div>
    )
  }

  const balance = order.price - order.paid
  const statusClass = ORDER_STATUS_COLORS[order.status as OrderStatus]

  const branchNames: Record<number, string> = {
    1: 'الميرة',
    2: 'الشارع التجاري',
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* شريط الحالة */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <StatusTimeline
            currentStatus={order.status}
            onStatusChange={updateStatus}
            readonly={false}
          />
        </div>

        {/* معلومات العميل */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">معلومات العميل</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500">اسم العميل</p>
              <p className="font-medium text-gray-900">{order.customer?.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">رقم الهاتف</p>
              <p className="font-medium text-gray-900" dir="ltr">{order.customer?.phone}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">الفرع</p>
              <p className="font-medium text-gray-900">{branchNames[order.branch_id] || order.branch_id}</p>
            </div>
          </div>
        </div>

        {/* القطع */}
        {order.items && order.items.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">القطع</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-right py-2 text-sm font-medium text-gray-500">القطعة</th>
                    <th className="text-center py-2 text-sm font-medium text-gray-500">الكمية</th>
                    <th className="text-center py-2 text-sm font-medium text-gray-500">السعر</th>
                    <th className="text-center py-2 text-sm font-medium text-gray-500">الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item: any, index: number) => (
                    <tr key={index} className="border-b border-gray-100">
                      <td className="py-3">{item.piece_type}</td>
                      <td className="py-3 text-center">{item.quantity}</td>
                      <td className="py-3 text-center">{item.unit_price}</td>
                      <td className="py-3 text-center font-medium">{item.total_price} ر.س</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* القياسات */}
        {order.measurements && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">القياسات</h2>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
              {Object.entries(order.measurements)
                .filter(([key]) => !['id', 'order_id', 'local_id', 'notes', 'taken_by', 'created_at'].includes(key))
                .map(([key, value]) => (
                  <div key={key}>
                    <p className="text-sm text-gray-500">{key}</p>
                    <p className="font-medium text-gray-900">{value as string}</p>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* المعلومات المالية */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">الملخص المالي</h2>
            <button className="flex items-center gap-2 text-blue-600 hover:text-blue-700">
              <Plus className="w-4 h-4" />
              إضافة دفعة
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-500">إجمالي السعر</p>
              <p className="text-2xl font-bold text-gray-900">
                {order.price.toLocaleString('ar-SA')} ر.س
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">المدفوع</p>
              <p className="text-2xl font-bold text-green-600">
                {order.paid.toLocaleString('ar-SA')} ر.س
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">المتبقي</p>
              <p className={`text-2xl font-bold ${balance > 0 ? 'text-orange-600' : 'text-gray-900'}`}>
                {balance.toLocaleString('ar-SA')} ر.س
              </p>
            </div>
          </div>

          {/* المدفوعات */}
          {order.payments && order.payments.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-100">
              <h3 className="text-sm font-medium text-gray-700 mb-3">سجل المدفوعات</h3>
              <div className="space-y-2">
                {order.payments.map((payment: any) => (
                  <div key={payment.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{payment.amount} ر.س</p>
                      <p className="text-xs text-gray-500">
                        {new Date(payment.created_at).toLocaleDateString('ar-SA')}
                      </p>
                    </div>
                    <span className="text-sm text-gray-600">
                      {payment.method === 'cash' ? 'نقداً' : 'بطاقة'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* التواريخ */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">التواريخ</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">تاريخ الاستلام</p>
              <p className="font-medium text-gray-900">
                {order.receive_date
                  ? new Date(order.receive_date).toLocaleDateString('ar-SA')
                  : '-'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">تاريخ التسليم المحدد</p>
              <p className="font-medium text-gray-900">
                {order.delivery_date
                  ? new Date(order.delivery_date).toLocaleDateString('ar-SA')
                  : '-'}
              </p>
            </div>
          </div>
        </div>

        {/* الملاحظات */}
        {order.details && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">ملاحظات</h2>
            <p className="text-gray-700">{order.details}</p>
          </div>
        )}
      </div>
    </div>
  )
}
