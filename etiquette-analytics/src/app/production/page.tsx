'use client'

import { useState, useEffect } from 'react'
import { Search } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { TaskBoard } from '@/components/production/TaskBoard'

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
  order?: { order_number: string; customer?: { name: string }; piece_type: string }
  worker?: { name: string }
}

export default function ProductionPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [taskTypeFilter, setTaskTypeFilter] = useState<string>('all')

  useEffect(() => { fetchTasks() }, [])

  const fetchTasks = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/tasks')
      const json = await res.json()
      setTasks(json.tasks || [])
    } catch (error) {
      console.error('Error fetching tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredTasks = tasks.filter(task => {
    if (taskTypeFilter !== 'all' && task.task_type !== taskTypeFilter) return false
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      task.order?.order_number?.toLowerCase().includes(searchLower) ||
      task.order?.customer?.name?.toLowerCase().includes(searchLower) ||
      task.worker?.name?.toLowerCase().includes(searchLower)
    )
  })

  const tasksByStatus: Record<TaskStatus, Task[]> = {
    pending: filteredTasks.filter(t => t.status === 'pending'),
    in_progress: filteredTasks.filter(t => t.status === 'in_progress'),
    done: filteredTasks.filter(t => t.status === 'done'),
  }

  const updateTaskStatus = async (taskId: number, newStatus: TaskStatus) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) fetchTasks()
    } catch (error) {
      console.error('Error updating task:', error)
    }
  }

  const assignWorker = async (taskId: number, workerId: number | null) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigned_to: workerId }),
      })
      if (res.ok) fetchTasks()
    } catch (error) {
      console.error('Error assigning worker:', error)
    }
  }

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="inline-block w-8 h-8 border-4 border-accent-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">الإنتاج والمهام</h1>
          <p className="page-subtitle">تتبع مهام القص والخياطة</p>
        </div>
      </div>

      <div className="kpi-grid gap-mb-mobile">
        <div className="kpi-card">
          <p className="kpi-title">إجمالي المهام</p>
          <p className="kpi-value">{filteredTasks.length}</p>
        </div>
        <div className="kpi-card">
          <p className="kpi-title">قيد الانتظار</p>
          <p className="kpi-value text-accent-warning">{tasksByStatus.pending.length}</p>
        </div>
        <div className="kpi-card">
          <p className="kpi-title">قيد التنفيذ</p>
          <p className="kpi-value text-accent-primary">{tasksByStatus.in_progress.length}</p>
        </div>
        <div className="kpi-card">
          <p className="kpi-title">مكتملة</p>
          <p className="kpi-value text-accent-success">{tasksByStatus.done.length}</p>
        </div>
      </div>

      <div className="filter-bar">
        <div className="flex-1 relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
          <input
            type="text"
            placeholder="بحث برقم الطلب أو العميل أو العامل..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pr-10 pl-4 py-2 min-h-[44px] border border-border-primary rounded-lg bg-bg-input text-text-primary focus:ring-2 focus:ring-accent-primary focus:border-accent-primary"
          />
        </div>
        <select
          value={taskTypeFilter}
          onChange={e => setTaskTypeFilter(e.target.value)}
          className="px-4 py-2 min-h-[44px] border border-border-primary rounded-lg bg-bg-input text-text-primary focus:ring-2 focus:ring-accent-primary"
        >
          <option value="all">جميع أنواع المهام</option>
          <option value="cutting">قص</option>
          <option value="sewing">خياطة</option>
          <option value="design">تصميم</option>
        </select>
      </div>

      <TaskBoard tasks={tasksByStatus} onStatusChange={updateTaskStatus} onAssignWorker={assignWorker} />
    </AppShell>
  )
}
