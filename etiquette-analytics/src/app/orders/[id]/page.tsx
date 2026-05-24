// صفحة تفاصيل الطلب
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowRight, Pencil, Trash2, Plus, CreditCard } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
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
      <AppShell>
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-accent-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppShell>
    )
  }

  if (!order) {
    return (
      <AppShell>
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-text-tertiary">الطلب غير موجود</p>
        </div>
      </AppShell>
    )
  }

  const balance = order.price - order.paid
  const statusClass = ORDER_STATUS_COLORS[order.status as OrderStatus]

  const branchNames: Record<number, string> = {
    1: 'الميرة',
    2: 'الشارع التجاري',
  }

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* شريط الحالة */}
        <div className="bg-bg-card rounded-xl shadow-sm border border-border-primary p-6">
          <StatusTimeline
            currentStatus={order.status}
            onStatusChange={updateStatus}
            readonly={false}
          />
        </div>

        {/* معلومات العميل */}
        <div className="bg-bg-card rounded-xl shadow-sm border border-border-primary p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">معلومات العميل</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-text-tertiary">اسم العميل</p>
              <p className="font-medium text-text-primary">{order.customer?.name}</p>
            </div>
            <div>
              <p className="text-sm text-text-tertiary">رقم الهاتف</p>
              <p className="font-medium text-text-primary" dir="ltr">{order.customer?.phone}</p>
            </div>
            <div>
              <p className="text-sm text-text-tertiary">الفرع</p>
              <p className="font-medium text-text-primary">{branchNames[order.branch_id] || order.branch_id}</p>
            </div>
          </div>
        </div>

        {/* القطع */}
        {order.items && order.items.length > 0 && (
          <div className="bg-bg-card rounded-xl shadow-sm border border-border-primary p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">القطع</h2>
            <div className="table-scroll overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border-primary">
                    <th className="text-right py-2 text-sm font-medium text-text-tertiary">القطعة</th>
                    <th className="text-center py-2 text-sm font-medium text-text-tertiary">الكمية</th>
                    <th className="text-center py-2 text-sm font-medium text-text-tertiary">السعر</th>
                    <th className="text-center py-2 text-sm font-medium text-text-tertiary">الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item: any, index: number) => (
                    <tr key={index} className="border-b border-border-primary">
                      <td className="py-3 text-text-primary">{item.piece_type}</td>
                      <td className="py-3 text-center text-text-primary">{item.quantity}</td>
                      <td className="py-3 text-center text-text-primary">{item.unit_price}</td>
                      <td className="py-3 text-center font-medium text-text-primary">{item.total_price} ر.ق</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* القياسات */}
        {order.measurements && (
          <div className="bg-bg-card rounded-xl shadow-sm border border-border-primary p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">القياسات</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {Object.entries(order.measurements)
                .filter(([key]) => !['id', 'order_id', 'local_id', 'notes', 'taken_by', 'created_at'].includes(key))
                .map(([key, value]) => (
                  <div key={key}>
                    <p className="text-sm text-text-tertiary">{key}</p>
                    <p className="font-medium text-text-primary">{value as string}</p>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* المعلومات المالية */}
        <div className="bg-bg-card rounded-xl shadow-sm border border-border-primary p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-text-primary">الملخص المالي</h2>
            <button className="flex items-center gap-2 min-h-[44px] text-accent-primary hover:text-accent-primary-hover">
              <Plus className="w-4 h-4" />
              إضافة دفعة
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-text-tertiary">إجمالي السعر</p>
              <p className="text-2xl font-bold text-text-primary">
                {order.price.toLocaleString('ar-QA')} ر.ق
              </p>
            </div>
            <div>
              <p className="text-sm text-text-tertiary">المدفوع</p>
              <p className="text-2xl font-bold text-green-600">
                {order.paid.toLocaleString('ar-QA')} ر.ق
              </p>
            </div>
            <div>
              <p className="text-sm text-text-tertiary">المتبقي</p>
              <p className={`text-2xl font-bold ${balance > 0 ? 'text-orange-600' : 'text-text-primary'}`}>
                {balance.toLocaleString('ar-QA')} ر.ق
              </p>
            </div>
          </div>

          {/* المدفوعات */}
          {order.payments && order.payments.length > 0 && (
            <div className="mt-6 pt-6 border-t border-border-primary">
              <h3 className="text-sm font-medium text-text-secondary mb-3">سجل المدفوعات</h3>
              <div className="space-y-2">
                {order.payments.map((payment: any) => (
                  <div key={payment.id} className="flex items-center justify-between py-2 px-3 bg-bg-secondary rounded-lg">
                    <div>
                      <p className="font-medium text-text-primary">{payment.amount} ر.ق</p>
                      <p className="text-xs text-text-tertiary">
                        {new Date(payment.created_at).toLocaleDateString('ar-QA')}
                      </p>
                    </div>
                    <span className="text-sm text-text-secondary">
                      {payment.method === 'cash' ? 'نقداً' : 'بطاقة'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* التواريخ */}
        <div className="bg-bg-card rounded-xl shadow-sm border border-border-primary p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">التواريخ</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-text-tertiary">تاريخ الاستلام</p>
              <p className="font-medium text-text-primary">
                {order.receive_date
                  ? new Date(order.receive_date).toLocaleDateString('ar-QA')
                  : '-'}
              </p>
            </div>
            <div>
              <p className="text-sm text-text-tertiary">تاريخ التسليم المحدد</p>
              <p className="font-medium text-text-primary">
                {order.delivery_date
                  ? new Date(order.delivery_date).toLocaleDateString('ar-QA')
                  : '-'}
              </p>
            </div>
          </div>
        </div>

        {/* الملاحظات */}
        {order.details && (
          <div className="bg-bg-card rounded-xl shadow-sm border border-border-primary p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">ملاحظات</h2>
            <p className="text-text-secondary">{order.details}</p>
          </div>
        )}
      </div>
    </AppShell>
  )
}
