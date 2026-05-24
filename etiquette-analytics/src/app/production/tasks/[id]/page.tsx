'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowRight, Clock, User, Edit2, Save, X } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'

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
  order?: { order_number: string; customer?: { name: string }; piece_type: string; branch_id: number }
  worker?: { name: string }
  order_item?: { piece_type: string; quantity: number }
}

interface Worker {
  id: number
  name: string
  role: string
  worker_type: string | null
  branch_id: number
  default_rate: number | null
}

const TASK_STATUS_LABELS: Record<TaskStatus, string> = { pending: 'قيد الانتظار', in_progress: 'قيد التنفيذ', done: 'مكتمل' }
const TASK_TYPE_LABELS: Record<string, string> = { cutting: 'قص', sewing: 'خياطة', design: 'تصميم' }
const WAGE_TYPE_LABELS: Record<string, string> = { percentage: 'نسبة مئوية', fixed: 'مبلغ ثابت' }

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
    if (id) { fetchTask(); fetchWorkers() }
  }, [id])

  const fetchTask = async () => {
    try {
      const res = await fetch(`/api/tasks/${id}`)
      const json = await res.json()
      setTask(json.task)
      if (json.task) setWageAmount(json.task.wage_amount || 0)
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
      const res = await fetch(`/api/tasks/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }) })
      if (res.ok) fetchTask()
    } catch (error) {
      console.error('Error updating status:', error)
    } finally {
      setSaving(false)
    }
  }

  const assignWorker = async (workerId: number | null) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ assigned_to: workerId }) })
      if (res.ok) fetchTask()
    } catch (error) {
      console.error('Error assigning worker:', error)
    } finally {
      setSaving(false)
    }
  }

  const saveWage = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ wage_amount: wageAmount }) })
      if (res.ok) { fetchTask(); setEditingWage(false) }
    } catch (error) {
      console.error('Error updating wage:', error)
    } finally {
      setSaving(false)
    }
  }

  const calculateWage = (): number => {
    if (!task) return 0
    if (task.wage_type === 'percentage') return (task.wage_rate / 100) * task.wage_amount
    return task.wage_amount
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

  if (!task) {
    return (
      <AppShell>
        <div className="text-center py-12"><p className="text-text-tertiary">المهمة غير موجودة</p></div>
      </AppShell>
    )
  }

  const statusStyles: Record<TaskStatus, { bg: string; color: string }> = {
    pending: { bg: 'var(--accent-warning-light)', color: 'var(--accent-warning)' },
    in_progress: { bg: 'var(--accent-info-light)', color: 'var(--accent-info)' },
    done: { bg: 'var(--accent-success-light)', color: 'var(--accent-success)' },
  }

  return (
    <AppShell>
      <button onClick={() => router.back()} className="flex items-center gap-2 text-text-secondary hover:text-text-primary mb-6 min-h-[44px]">
        <ArrowRight className="w-5 h-5" />
        عودة
      </button>

      <div className="card mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="page-title">{TASK_TYPE_LABELS[task.task_type]}</h1>
              <span className="status-badge" style={{ background: 'var(--accent-info-light)', color: 'var(--accent-info)' }}>
                #{task.order?.order_number}
              </span>
            </div>
            <p className="text-text-secondary">{task.order?.customer?.name} - {task.order?.piece_type}</p>
          </div>
          <span className="status-badge" style={{ background: statusStyles[task.status].bg, color: statusStyles[task.status].color }}>
            {TASK_STATUS_LABELS[task.status]}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {/* Status & Actions */}
        <div className="card">
          <h2 className="section-title mb-4">الحالة</h2>
          <div className="space-y-3">
            {task.status !== 'done' && (
              <button onClick={() => updateStatus(task.status === 'pending' ? 'in_progress' : 'done')} disabled={saving}
                className="w-full min-h-[44px] py-3 bg-accent-primary text-white rounded-lg hover:bg-accent-primary-hover disabled:opacity-50 font-semibold">
                {task.status === 'pending' ? 'بدء المهمة' : 'إكمال المهمة'}
              </button>
            )}
            {task.status !== 'pending' && (
              <button onClick={() => updateStatus('pending')} disabled={saving}
                className="w-full min-h-[44px] py-3 bg-bg-tertiary text-text-secondary rounded-lg hover:bg-border-primary disabled:opacity-50 font-semibold">
                إعادة للانتظار
              </button>
            )}
          </div>

          <div className="mt-6 pt-6 border-t border-border-primary space-y-3">
            {task.started_at && (
              <div className="flex items-center gap-3 text-sm">
                <Clock className="w-4 h-4 text-text-muted" />
                <span className="text-text-secondary">بدأ:</span>
                <span className="font-medium text-text-primary">{new Date(task.started_at).toLocaleString('ar-QA')}</span>
              </div>
            )}
            {task.completed_at && (
              <div className="flex items-center gap-3 text-sm">
                <Clock className="w-4 h-4 text-accent-success" />
                <span className="text-text-secondary">أكتمل:</span>
                <span className="font-medium text-text-primary">{new Date(task.completed_at).toLocaleString('ar-QA')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Worker Assignment */}
        <div className="card">
          <h2 className="section-title mb-4">العامل المكلف</h2>
          <div className="space-y-3">
            {task.worker ? (
              <div className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-accent-info-light rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-accent-info" />
                  </div>
                  <div>
                    <p className="font-medium text-text-primary">{task.worker.name}</p>
                    <p className="text-sm text-text-tertiary">معين حالياً</p>
                  </div>
                </div>
                <button onClick={() => assignWorker(null)} disabled={saving} className="text-accent-danger hover:bg-accent-danger-light p-2 rounded min-h-[44px] min-w-[44px] flex items-center justify-center">
                  <X className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <p className="text-text-tertiary text-center py-4">لم يتم تعيين عامل</p>
            )}

            <div className="pt-3 border-t border-border-primary">
              <p className="text-sm text-text-tertiary mb-2">تعيين عامل:</p>
              <div className="grid grid-cols-2 gap-2">
                {workers.map(worker => (
                  <button key={worker.id} onClick={() => assignWorker(worker.id)} disabled={saving}
                    className={`p-2 min-h-[44px] rounded-lg text-right text-sm border-2 transition-colors ${
                      task.assigned_to === worker.id
                        ? 'bg-accent-info-light border-accent-primary'
                        : 'bg-bg-tertiary hover:bg-bg-card-hover border-transparent'
                    }`}>
                    <p className="font-medium text-text-primary">{worker.name}</p>
                    <p className="text-xs text-text-tertiary">
                      {worker.worker_type === 'tailor' ? 'خياط' : worker.worker_type === 'master_cutter' ? 'مستشار قص' : worker.role}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Wage Info */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">الأجر</h2>
            {!editingWage && (
              <button onClick={() => setEditingWage(true)} className="p-2 hover:bg-bg-tertiary rounded min-h-[44px] min-w-[44px] flex items-center justify-center">
                <Edit2 className="w-4 h-4 text-text-muted" />
              </button>
            )}
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-border-primary">
              <span className="text-text-secondary">نوع الأجر</span>
              <span className="font-medium text-text-primary">{WAGE_TYPE_LABELS[task.wage_type]}</span>
            </div>
            {task.wage_type === 'percentage' && (
              <div className="flex justify-between items-center py-2 border-b border-border-primary">
                <span className="text-text-secondary">النسبة</span>
                <span className="font-medium text-text-primary">{task.wage_rate}%</span>
              </div>
            )}
            <div className="flex justify-between items-center py-2">
              <span className="text-text-secondary">قيمة الأجر</span>
              {editingWage ? (
                <div className="flex items-center gap-2">
                  <input type="number" value={wageAmount} onChange={e => setWageAmount(parseFloat(e.target.value) || 0)} className="w-24 px-2 py-1 min-h-[44px] border border-border-primary rounded bg-bg-input text-text-primary" step={0.01} />
                  <button onClick={saveWage} disabled={saving} className="p-2 min-h-[44px] min-w-[44px] bg-accent-success text-white rounded hover:bg-accent-success/80"><Save className="w-4 h-4" /></button>
                  <button onClick={() => { setEditingWage(false); setWageAmount(task.wage_amount || 0) }} className="p-2 min-h-[44px] min-w-[44px] bg-bg-tertiary rounded hover:bg-border-primary"><X className="w-4 h-4" /></button>
                </div>
              ) : (
                <span className="font-bold text-lg text-text-primary">{task.wage_amount.toLocaleString('ar-QA')} ر.ق</span>
              )}
            </div>
            {task.wage_type === 'percentage' && (
              <div className="mt-4 p-3 bg-accent-success-light rounded-lg">
                <p className="text-sm text-text-secondary">إجمالي المستحق</p>
                <p className="text-xl font-bold text-accent-success">{calculateWage().toLocaleString('ar-QA')} ر.ق</p>
              </div>
            )}
          </div>
        </div>

        {/* Notes */}
        <div className="card">
          <h2 className="section-title mb-4">ملاحظات</h2>
          <p className="text-text-secondary">{task.notes || 'لا توجد ملاحظات'}</p>
        </div>
      </div>
    </AppShell>
  )
}

export default function TaskDetailPage() {
  return (
    <Suspense fallback={
      <AppShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="inline-block w-8 h-8 border-4 border-accent-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppShell>
    }>
      <TaskDetailContent />
    </Suspense>
  )
}
