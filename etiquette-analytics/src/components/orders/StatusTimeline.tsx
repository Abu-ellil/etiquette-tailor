// شريط تقدم حالة الطلب
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, type OrderStatus } from '@/types/order'

interface StatusTimelineProps {
  currentStatus: OrderStatus
  onStatusChange?: (status: OrderStatus) => void
  readonly?: boolean
}

const statuses: OrderStatus[] = ['intake', 'cutting', 'sewing', 'ready', 'delivered']

export function StatusTimeline({ currentStatus, onStatusChange, readonly = false }: StatusTimelineProps) {
  const currentIndex = statuses.indexOf(currentStatus)

  return (
    <div className="flex items-center justify-between gap-2">
      {statuses.map((status, index) => {
        const isCompleted = index <= currentIndex
        const isCurrent = index === currentIndex

        return (
          <div key={status} className="flex items-center flex-1">
            <button
              onClick={() => !readonly && onStatusChange?.(status)}
              disabled={readonly}
              className={`
                flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all
                ${readonly ? 'cursor-default' : 'cursor-pointer hover:ring-2 hover:ring-offset-1'}
                ${isCurrent ? ORDER_STATUS_COLORS[status] : 'bg-gray-50 text-gray-400'}
                ${isCompleted && !isCurrent ? 'bg-gray-100 text-gray-600' : ''}
              `}
            >
              <div className="flex flex-col items-center gap-1">
                <span className="text-xs">{ORDER_STATUS_LABELS[status]}</span>
                <div className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${isCompleted ? 'bg-current' : 'bg-gray-300'}`} />
                </div>
              </div>
            </button>
            {index < statuses.length - 1 && (
              <div className={`w-6 h-0.5 mx-1 ${isCompleted ? 'bg-gray-400' : 'bg-gray-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}
