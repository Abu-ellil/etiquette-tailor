// صفحة تفاصيل المهمة
'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowRight, Clock, User, DollarSign, Edit2, Save, X } from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'

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
    branch_id: number
  }
  worker?: { name: string }
  order_item?: {
    piece_type: string
    quantity: number
  }
}

interface Worker {
  id: number
  name: string
  role: string
  worker_type: string | null
  branch_id: number
  default_rate: number | null
}

const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'قيد الانتظار',
  in_progress: 'قيد التنفيذ',
  done: 'مكتمل',
}

const TASK_TYPE_LABELS: Record<string, string> = {
  cutting: 'قص',
  sewing: 'خياطة',
  design: 'تصميم',
}

const WAGE_TYPE_LABELS: Record<string, string> = {
  percentage: 'نسبة مئوية',
  fixed: 'مبلغ ثابت',
}

function TaskDetailContent() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [task, setTask] = useState<Task | null>(null)
  const [workers, setWorkers] = useState<Worker[]>([])
  const [loading, setLoading] = useState(true)
  const [editingWage, setEditingWage] = useState(false)
  const [wageAmount, setWageAmount] = useState(0)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (id) {
      fetchTask()
      fetchWorkers()
    }
  }, [id])

  const fetchTask = async () => {
    try {
      const res = await fetch(`/api/tasks/${id}`)
      const json = await res.json()
      setTask(json.task)
      if (json.task) {
        setWageAmount(json.task.wage_amount || 0)
      }
    } catch (error) {
      console.error('Error fetching task:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchWorkers = async () => {
    try {
      const res = await fetch('/api/workers')
      const json = await res.json()
      setWorkers(json.workers || [])
    } catch (error) {
      console.error('Error fetching workers:', error)
    }
  }

  const updateStatus = async (newStatus: TaskStatus) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        fetchTask()
      }
    } catch (error) {
      console.error('Error updating status:', error)
    } finally {
      setSaving(false)
    }
  }

  const assignWorker = async (workerId: number | null) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigned_to: workerId }),
      })
      if (res.ok) {
        fetchTask()
      }
    } catch (error) {
      console.error('Error assigning worker:', error)
    } finally {
      setSaving(false)
    }
  }

  const saveWage = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wage_amount: wageAmount }),
      })
      if (res.ok) {
        fetchTask()
        setEditingWage(false)
      }
    } catch (error) {
      console.error('Error updating wage:', error)
    } finally {
      setSaving(false)
    }
  }

  const calculateWage = (): number => {
    if (!task) return 0
    if (task.wage_type === 'percentage') {
      return (task.wage_rate / 100) * task.wage_amount
    }
    return task.wage_amount
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50" dir="rtl">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (!task) {
    return (
      <div className="min-h-screen bg-gray-50" dir="rtl">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <p className="text-gray-500">المهمة غير موجودة</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowRight className="w-5 h-5" />
          عودة
        </button>

        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-gray-900">
                  {TASK_TYPE_LABELS[task.task_type]}
                </h1>
                <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                  #{task.order?.order_number}
                </span>
              </div>
              <p className="text-gray-600">
                {task.order?.customer?.name} - {task.order?.piece_type}
              </p>
            </div>
            <div className="text-left">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                task.status === 'pending'
                  ? 'bg-orange-100 text-orange-700'
                  : task.status === 'in_progress'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-green-100 text-green-700'
              }`}>
                {TASK_STATUS_LABELS[task.status]}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Status & Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold mb-4">الحالة</h2>
            <div className="space-y-3">
              {task.status !== 'done' && (
                <button
                  onClick={() => updateStatus(task.status === 'pending' ? 'in_progress' : 'done')}
                  disabled={saving}
                  className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {task.status === 'pending' ? 'بدء المهمة' : 'إكمال المهمة'}
                </button>
              )}
              {task.status !== 'pending' && (
                <button
                  onClick={() => updateStatus('pending')}
                  disabled={saving}
                  className="w-full py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50"
                >
                  إعادة للانتظار
                </button>
              )}
            </div>

            {/* Timeline */}
            <div className="mt-6 pt-6 border-t border-gray-100 space-y-3">
              {task.started_at && (
                <div className="flex items-center gap-3 text-sm">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">بدأ:</span>
                  <span className="font-medium">
                    {new Date(task.started_at).toLocaleString('ar-SA')}
                  </span>
                </div>
              )}
              {task.completed_at && (
                <div className="flex items-center gap-3 text-sm">
                  <Clock className="w-4 h-4 text-green-500" />
                  <span className="text-gray-600">أكتمل:</span>
                  <span className="font-medium">
                    {new Date(task.completed_at).toLocaleString('ar-SA')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Worker Assignment */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold mb-4">العامل المكلف</h2>
            <div className="space-y-3">
              {task.worker ? (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">{task.worker.name}</p>
                      <p className="text-sm text-gray-500">معين حالياً</p>
                    </div>
                  </div>
                  <button
                    onClick={() => assignWorker(null)}
                    disabled={saving}
                    className="text-red-600 hover:bg-red-50 p-2 rounded"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">لم يتم تعيين عامل</p>
              )}

              <div className="pt-3 border-t border-gray-100">
                <p className="text-sm text-gray-500 mb-2">تعيين عامل:</p>
                <div className="grid grid-cols-2 gap-2">
                  {workers.map(worker => (
                    <button
                      key={worker.id}
                      onClick={() => assignWorker(worker.id)}
                      disabled={saving}
                      className={`p-2 rounded-lg text-right text-sm ${
                        task.assigned_to === worker.id
                          ? 'bg-blue-100 border-2 border-blue-500'
                          : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                      }`}
                    >
                      <p className="font-medium">{worker.name}</p>
                      <p className="text-xs text-gray-500">
                        {worker.worker_type === 'tailor' ? 'خياط' : worker.worker_type === 'master_cutter' ? 'مستشار قص' : worker.role}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Wage Info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">الأجر</h2>
              {!editingWage && (
                <button
                  onClick={() => setEditingWage(true)}
                  className="p-2 hover:bg-gray-100 rounded"
                >
                  <Edit2 className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">نوع الأجر</span>
                <span className="font-medium">{WAGE_TYPE_LABELS[task.wage_type]}</span>
              </div>

              {task.wage_type === 'percentage' && (
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">النسبة</span>
                  <span className="font-medium">{task.wage_rate}%</span>
                </div>
              )}

              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600">قيمة الأجر</span>
                {editingWage ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={wageAmount}
                      onChange={e => setWageAmount(parseFloat(e.target.value) || 0)}
                      className="w-24 px-2 py-1 border border-gray-300 rounded"
                      step={0.01}
                    />
                    <button
                      onClick={saveWage}
                      disabled={saving}
                      className="p-1 bg-green-500 text-white rounded hover:bg-green-600"
                    >
                      <Save className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setEditingWage(false)
                        setWageAmount(task.wage_amount || 0)
                      }}
                      className="p-1 bg-gray-300 rounded hover:bg-gray-400"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <span className="font-bold text-lg">
                    {task.wage_amount.toLocaleString('ar-SA')} ر.س
                  </span>
                )}
              </div>

              {task.wage_type === 'percentage' && (
                <div className="mt-4 p-3 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600">إجمالي المستحق</p>
                  <p className="text-xl font-bold text-green-700">
                    {calculateWage().toLocaleString('ar-SA')} ر.س
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold mb-4">ملاحظات</h2>
            <p className="text-gray-600">
              {task.notes || 'لا توجد ملاحظات'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function TaskDetailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50" dir="rtl">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    }>
      <TaskDetailContent />
    </Suspense>
  )
}
