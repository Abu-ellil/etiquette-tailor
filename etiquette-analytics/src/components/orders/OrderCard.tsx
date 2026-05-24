// بطاقة عرض الطلب في القائمة
import Link from 'next/link'
import { Clock, User, MapPin } from 'lucide-react'
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, type Order } from '@/types/order'

interface OrderCardProps {
  order: Order
}

export function OrderCard({ order }: OrderCardProps) {
  const balance = order.price - order.paid
  const statusClass = ORDER_STATUS_COLORS[order.status]

  const branchNames: Record<number, string> = {
    1: 'الميرة',
    2: 'الشارع التجاري',
  }

  return (
    <Link
      href={`/orders/${order.id}`}
      className="block min-h-[44px] bg-bg-card rounded-xl shadow-sm border border-border-primary p-4 hover:bg-bg-card-hover hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-4">
        {/* معلومات أساسية */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <span className="font-semibold text-text-primary">#{order.order_number}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusClass}`}>
              {ORDER_STATUS_LABELS[order.status]}
            </span>
          </div>

          <div className="flex items-center gap-4 text-sm text-text-secondary">
            <div className="flex items-center gap-1">
              <User className="w-4 h-4" />
              <span>{order.customer?.name}</span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              <span>{branchNames[order.branch_id] || order.branch_id}</span>
            </div>
          </div>

          {order.details && (
            <p className="mt-2 text-sm text-text-tertiary line-clamp-1">{order.details}</p>
          )}
        </div>

        {/* المبالغ */}
        <div className="text-left">
          <div className="text-lg font-semibold text-text-primary">
            {order.price.toLocaleString('ar-SA')} ر.س
          </div>
          <div className="text-sm text-text-tertiary">
            مدفوع: {order.paid.toLocaleString('ar-SA')}
          </div>
          {balance > 0 && (
            <div className="text-sm text-orange-600">
              متبقي: {balance.toLocaleString('ar-SA')}
            </div>
          )}
        </div>
      </div>

      {/* التواريخ */}
      <div className="mt-3 pt-3 border-t border-border-primary flex items-center justify-between text-xs text-text-tertiary">
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span>
            {order.receive_date
              ? new Date(order.receive_date).toLocaleDateString('ar-SA')
              : new Date(order.created_at || '').toLocaleDateString('ar-SA')}
          </span>
        </div>
        {order.delivery_date && (
          <span>
            التسليم: {new Date(order.delivery_date).toLocaleDateString('ar-SA')}
          </span>
        )}
      </div>
    </Link>
  )
}
