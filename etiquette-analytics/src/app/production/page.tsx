// صفحة الإنتاج والمهام
'use client'

import { useState, useEffect } from 'react'
import { Search, Filter, Plus, User, Clock } from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'
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
  order?: {
    order_number: string
    customer?: { name: string }
    piece_type: string
  }
  worker?: { name: string }
}

const TASK_TYPE_LABELS: Record<string, string> = {
  cutting: 'قص',
  sewing: 'خياطة',
  design: 'تصميم',
}

export default function ProductionPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [branchFilter, setBranchFilter] = useState<string>('all')
  const [taskTypeFilter, setTaskTypeFilter] = useState<string>('all')

  useEffect(() => {
    fetchTasks()
  }, [])

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
      if (res.ok) {
        fetchTasks()
      }
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
      if (res.ok) {
        fetchTasks()
      }
    } catch (error) {
      console.error('Error assigning worker:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50" dir="rtl">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-12 text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">الإنتاج والمهام</h1>
            <p className="text-sm text-gray-500 mt-1">تتبع مهام القص والخياطة</p>
          </div>
        </div>

        {/* إحصائيات */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <p className="text-sm text-gray-500 mb-1">إجمالي المهام</p>
            <p className="text-2xl font-bold text-gray-900">{filteredTasks.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <p className="text-sm text-gray-500 mb-1">قيد الانتظار</p>
            <p className="text-2xl font-bold text-orange-600">{tasksByStatus.pending.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <p className="text-sm text-gray-500 mb-1">قيد التنفيذ</p>
            <p className="text-2xl font-bold text-blue-600">{tasksByStatus.in_progress.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <p className="text-sm text-gray-500 mb-1">مكتملة</p>
            <p className="text-2xl font-bold text-green-600">{tasksByStatus.done.length}</p>
          </div>
        </div>

        {/* الفلاتر */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="بحث برقم الطلب أو العميل أو العامل..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <select
              value={taskTypeFilter}
              onChange={e => setTaskTypeFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">جميع أنواع المهام</option>
              <option value="cutting">قص</option>
              <option value="sewing">خياطة</option>
              <option value="design">تصميم</option>
            </select>
          </div>
        </div>

        {/* لوحة كانبان */}
        <TaskBoard
          tasks={tasksByStatus}
          onStatusChange={updateTaskStatus}
          onAssignWorker={assignWorker}
        />
      </div>
    </div>
  )
}
