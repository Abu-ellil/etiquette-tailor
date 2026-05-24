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

const COLUMNS: Array<{ key: TaskStatus; label: string; color: string; bgColor: string }> = [
  { key: 'pending', label: 'قيد الانتظار', color: 'orange', bgColor: 'bg-orange-50' },
  { key: 'in_progress', label: 'قيد التنفيذ', color: 'blue', bgColor: 'bg-blue-50' },
  { key: 'done', label: 'مكتمل', color: 'green', bgColor: 'bg-green-50' },
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
        <div key={column.key} className="bg-gray-100 rounded-xl p-4">
          <div className={`${column.bgColor} rounded-lg px-4 py-3 mb-4 flex items-center justify-between`}>
            <h3 className="font-semibold text-gray-800">{column.label}</h3>
            <span className={`bg-white px-2 py-1 rounded-full text-sm font-bold text-${column.color}-600`}>
              {tasks[column.key].length}
            </span>
          </div>

          <div className="space-y-3 min-h-[400px]">
            {tasks[column.key].length === 0 ? (
              <div className="bg-white rounded-lg p-6 text-center text-gray-400 text-sm">
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
