// صفحة تفاصيل العميل
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowRight, Pencil, Trash2, ShoppingCart, Phone, FileText } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
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
      <AppShell>
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-4 border-accent-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppShell>
    )
  }

  if (!customer) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-24">
          <p className="text-text-tertiary">العميل غير موجود</p>
        </div>
      </AppShell>
    )
  }

  const branchNames: Record<number, string> = {
    1: 'الميرة',
    2: 'الشارع التجاري',
  }

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-bg-tertiary rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <ArrowRight className="w-5 h-5 text-text-secondary" />
            </button>
            <div>
              <h1 className="page-title">{customer.name}</h1>
              <p className="page-subtitle">عميل منذ {new Date(customer.created_at).toLocaleDateString('ar-QA')}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push(`/orders/new?customer_id=${customer.id}`)}
              className="flex items-center gap-2 px-4 py-2 bg-accent-primary text-text-inverse rounded-lg hover:bg-accent-primary-hover min-h-[44px]"
            >
              <ShoppingCart className="w-4 h-4" />
              طلب جديد
            </button>
            <button
              onClick={() => router.push(`/customers/${customer.id}/edit`)}
              className="flex items-center gap-2 px-3 py-2 text-text-secondary hover:bg-bg-tertiary rounded-lg min-h-[44px]"
            >
              <Pencil className="w-4 h-4" />
              تعديل
            </button>
            <button
              onClick={deleteCustomer}
              className="flex items-center gap-2 px-3 py-2 text-accent-danger hover:bg-accent-danger-light rounded-lg min-h-[44px]"
            >
              <Trash2 className="w-4 h-4" />
              حذف
            </button>
          </div>
        </div>

        {/* معلومات العميل */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* بطاقة المعلومات */}
          <div className="bg-bg-card rounded-xl shadow-sm border border-border-primary p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">معلومات الاتصال</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-text-muted" />
                <div>
                  <p className="text-xs text-text-tertiary">رقم الهاتف</p>
                  <p className="font-medium text-text-primary" dir="ltr">{customer.phone}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-text-tertiary mb-1">الفرع</p>
                <p className="font-medium text-text-primary">{branchNames[customer.branch_id] || customer.branch_id}</p>
              </div>
              {customer.notes && (
                <div>
                  <p className="text-xs text-text-tertiary mb-1">ملاحظات</p>
                  <p className="text-sm text-text-secondary">{customer.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* بطاقة الملخص المالي */}
          <div className="bg-bg-card rounded-xl shadow-sm border border-border-primary p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">الملخص المالي</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-text-tertiary">إجمالي الطلبات</p>
                <p className="text-2xl font-bold text-text-primary">{orders.length}</p>
              </div>
              <div>
                <p className="text-sm text-text-tertiary">الرصيد المتبقي</p>
                <p className={`text-2xl font-bold ${totalBalance > 0 ? 'text-accent-warning' : 'text-accent-success'}`}>
                  {totalBalance.toLocaleString('ar-QA')} ر.ق
                </p>
              </div>
            </div>
          </div>

          {/* بطاقة إحصائيات سريعة */}
          <div className="bg-bg-card rounded-xl shadow-sm border border-border-primary p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">حالة الطلبات</h2>
            <div className="space-y-2">
              {Object.entries(ORDER_STATUS_LABELS).map(([key, label]) => {
                const count = orders.filter((o: any) => o.status === key).length
                if (count === 0) return null
                return (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-sm text-text-secondary">{label}</span>
                    <span className="font-medium text-text-primary">{count}</span>
                  </div>
                )
              })}
              {orders.length === 0 && (
                <p className="text-sm text-text-tertiary">لا توجد طلبات</p>
              )}
            </div>
          </div>
        </div>

        {/* سجل الطلبات */}
        <div className="bg-bg-card rounded-xl shadow-sm border border-border-primary p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">سجل الطلبات</h2>

          {orders.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-text-muted mx-auto mb-3" />
              <p className="text-text-tertiary">لا توجد طلبات لهذا العميل</p>
              <button
                onClick={() => router.push(`/orders/new?customer_id=${customer.id}`)}
                className="mt-4 px-4 py-2 bg-accent-primary text-text-inverse rounded-lg hover:bg-accent-primary-hover min-h-[44px]"
              >
                إنشاء طلب جديد
              </button>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border-primary">
                    <th className="text-right py-3 text-sm font-medium text-text-tertiary">رقم الطلب</th>
                    <th className="text-right py-3 text-sm font-medium text-text-tertiary">التاريخ</th>
                    <th className="text-center py-3 text-sm font-medium text-text-tertiary">الحالة</th>
                    <th className="text-left py-3 text-sm font-medium text-text-tertiary">السعر</th>
                    <th className="text-left py-3 text-sm font-medium text-text-tertiary">المدفوع</th>
                    <th className="text-left py-3 text-sm font-medium text-text-tertiary">المتبقي</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order: any) => {
                    const balance = order.price - order.paid
                    return (
                      <tr
                        key={order.id}
                        onClick={() => router.push(`/orders/${order.id}`)}
                        className="border-b border-border-primary hover:bg-bg-card-hover cursor-pointer"
                      >
                        <td className="py-3 font-medium text-text-primary">#{order.order_number}</td>
                        <td className="py-3 text-text-secondary">
                          {new Date(order.created_at).toLocaleDateString('ar-QA')}
                        </td>
                        <td className="py-3 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${ORDER_STATUS_COLORS[order.status as keyof typeof ORDER_STATUS_COLORS]}`}>
                            {ORDER_STATUS_LABELS[order.status as keyof typeof ORDER_STATUS_LABELS]}
                          </span>
                        </td>
                        <td className="py-3 text-text-primary">{order.price} ر.ق</td>
                        <td className="py-3 text-accent-success">{order.paid} ر.ق</td>
                        <td className={`py-3 ${balance > 0 ? 'text-accent-warning' : 'text-text-primary'}`}>
                          {balance} ر.ق
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
    </AppShell>
  )
}
