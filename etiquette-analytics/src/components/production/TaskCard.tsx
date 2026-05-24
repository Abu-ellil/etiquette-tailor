// بطاقة المهمة
'use client'

import { useState } from 'react'
import { Clock, User, Scissors, Shirt, PenTool, MoreVertical, ChevronLeft } from 'lucide-react'

type TaskStatus = 'pending' | 'in_progress' | 'done'

interface Worker {
  id: number
  name: string
}

interface Task {
  id: number
  order_id: number
  order_item_id: number | null
  task_type: 'cutting' | 'sewing' | 'design'
  assigned_to: number | null
  wage_type: 'percentage' | 'fixed'
  wage_rate: number
  wage_amount: number
  task_quantity: number
  status: TaskStatus
  started_at: string | null
  completed_at: string | null
  notes: string | null
  order?: {
    order_number: string
    customer?: { name: string }
    piece_type: string
  }
  worker?: { name: string }
}

interface TaskCardProps {
  task: Task
  workers: Worker[]
  onStatusChange: (taskId: number, newStatus: TaskStatus) => void
  onAssignWorker: (taskId: number, workerId: number | null) => void
  currentStatus: TaskStatus
}

const TASK_TYPE_ICONS: Record<string, React.ReactNode> = {
  cutting: <Scissors className="w-4 h-4" />,
  sewing: <Shirt className="w-4 h-4" />,
  design: <PenTool className="w-4 h-4" />,
}

const TASK_TYPE_LABELS: Record<string, string> = {
  cutting: 'قص',
  sewing: 'خياطة',
  design: 'تصميم',
}

export function TaskCard({ task, workers, onStatusChange, onAssignWorker, currentStatus }: TaskCardProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [showWorkers, setShowWorkers] = useState(false)

  const canMoveTo = (status: TaskStatus): boolean => {
    if (currentStatus === status) return false
    if (status === 'pending') return currentStatus !== 'pending'
    if (status === 'in_progress') return currentStatus === 'pending'
    if (status === 'done') return currentStatus === 'in_progress'
    return false
  }

  const handleStatusChange = (newStatus: TaskStatus) => {
    onStatusChange(task.id, newStatus)
    setShowMenu(false)
  }

  const handleAssignWorker = (workerId: number | null) => {
    onAssignWorker(task.id, workerId)
    setShowWorkers(false)
  }

  return (
    <div className="bg-bg-card rounded-lg shadow-sm border border-border-primary p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 bg-bg-tertiary text-text-secondary rounded-full text-xs font-medium flex items-center gap-1">
            {TASK_TYPE_ICONS[task.task_type]}
            {TASK_TYPE_LABELS[task.task_type]}
          </span>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 hover:bg-bg-tertiary rounded min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <MoreVertical className="w-4 h-4 text-text-muted" />
          </button>

          {showMenu && (
            <div className="absolute left-0 top-full mt-1 bg-bg-card border border-border-primary rounded-lg shadow-lg py-1 z-10 min-w-[140px]">
              {currentStatus !== 'pending' && (
                <button
                  onClick={() => handleStatusChange('pending')}
                  className="w-full px-3 py-2 text-right text-sm hover:bg-bg-card-hover min-h-[44px]"
                >
                  إلغاء البدء
                </button>
              )}
              {currentStatus === 'pending' && (
                <button
                  onClick={() => handleStatusChange('in_progress')}
                  className="w-full px-3 py-2 text-right text-sm hover:bg-bg-card-hover text-accent-primary min-h-[44px]"
                >
                  بدء المهمة
                </button>
              )}
              {currentStatus === 'in_progress' && (
                <button
                  onClick={() => handleStatusChange('done')}
                  className="w-full px-3 py-2 text-right text-sm hover:bg-bg-card-hover text-accent-success min-h-[44px]"
                >
                  إكمال المهمة
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-text-primary">
            #{task.order?.order_number || '-'}
          </span>
          <span className="text-xs text-text-tertiary">
            {task.order?.piece_type || '-'}
          </span>
        </div>

        {task.order?.customer?.name && (
          <p className="text-sm text-text-secondary">{task.order.customer.name}</p>
        )}

        <div className="flex items-center gap-2 pt-2 border-t border-border-primary">
          <button
            onClick={() => setShowWorkers(!showWorkers)}
            className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full min-h-[44px] ${
              task.worker ? 'bg-accent-info-light text-accent-info' : 'bg-bg-tertiary text-text-secondary'
            }`}
          >
            <User className="w-3 h-3" />
            {task.worker?.name || 'تعيين عامل'}
            <ChevronLeft className="w-3 h-3" />
          </button>

          <span className="text-xs text-text-tertiary">
            {task.wage_type === 'percentage'
              ? `${task.wage_rate}%`
              : `${task.wage_amount} ر.ق`}
          </span>
        </div>

        {showWorkers && (
          <div className="mt-2 pt-2 border-t border-border-primary">
            <p className="text-xs text-text-tertiary mb-1">اختر العامل:</p>
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => handleAssignWorker(null)}
                className="px-2 py-1 text-xs bg-bg-tertiary rounded hover:bg-bg-card-hover min-h-[44px]"
              >
                إلغاء التعيين
              </button>
              {workers.map(worker => (
                <button
                  key={worker.id}
                  onClick={() => handleAssignWorker(worker.id)}
                  className={`px-2 py-1 text-xs rounded min-h-[44px] ${
                    task.assigned_to === worker.id
                      ? 'bg-accent-primary text-white'
                      : 'bg-bg-tertiary hover:bg-bg-card-hover'
                  }`}
                >
                  {worker.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {task.started_at && (
          <div className="flex items-center gap-1 text-xs text-text-tertiary">
            <Clock className="w-3 h-3" />
            بدء: {new Date(task.started_at).toLocaleDateString('ar-QA')}
          </div>
        )}
      </div>
    </div>
  )
}
