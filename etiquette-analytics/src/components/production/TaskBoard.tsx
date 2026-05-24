// لوحة كانبان للمهام
'use client'

import { useEffect, useState } from 'react'
import { TaskCard } from './TaskCard'

type TaskStatus = 'pending' | 'in_progress' | 'done'

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

interface Worker {
  id: number
  name: string
}

interface TaskBoardProps {
  tasks: Record<TaskStatus, Task[]>
  onStatusChange: (taskId: number, newStatus: TaskStatus) => void
  onAssignWorker: (taskId: number, workerId: number | null) => void
}

const COLUMNS: Array<{ key: TaskStatus; label: string; accentClass: string; bgColor: string }> = [
  { key: 'pending', label: 'قيد الانتظار', accentClass: 'text-accent-warning', bgColor: 'bg-accent-warning-light' },
  { key: 'in_progress', label: 'قيد التنفيذ', accentClass: 'text-accent-primary', bgColor: 'bg-accent-info-light' },
  { key: 'done', label: 'مكتمل', accentClass: 'text-accent-success', bgColor: 'bg-accent-success-light' },
]

export function TaskBoard({ tasks, onStatusChange, onAssignWorker }: TaskBoardProps) {
  const [workers, setWorkers] = useState<Worker[]>([])

  useEffect(() => {
    fetchWorkers()
  }, [])

  const fetchWorkers = async () => {
    try {
      const res = await fetch('/api/workers')
      const json = await res.json()
      setWorkers(json.workers || [])
    } catch (error) {
      console.error('Error fetching workers:', error)
    }
  }
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {COLUMNS.map(column => (
        <div key={column.key} className="bg-bg-tertiary rounded-xl p-4">
          <div className={`${column.bgColor} rounded-lg px-4 py-3 mb-4 flex items-center justify-between`}>
            <h3 className="font-semibold text-text-primary">{column.label}</h3>
            <span className={`bg-bg-card px-2 py-1 rounded-full text-sm font-bold ${column.accentClass}`}>
              {tasks[column.key].length}
            </span>
          </div>

          <div className="space-y-3 min-h-[400px]">
            {tasks[column.key].length === 0 ? (
              <div className="bg-bg-card rounded-lg p-6 text-center text-text-muted text-sm">
                لا توجد مهام
              </div>
            ) : (
              tasks[column.key].map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  workers={workers}
                  onStatusChange={onStatusChange}
                  onAssignWorker={onAssignWorker}
                  currentStatus={column.key}
                />
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
