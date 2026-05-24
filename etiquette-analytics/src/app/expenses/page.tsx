'use client'

import { useState, useEffect } from 'react'
import { Search, Plus, X } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'

const CATEGORIES = [
  { value: 'rent', label: 'إيجار' },
  { value: 'utilities', label: 'مرافق' },
  { value: 'materials', label: 'مواد' },
  { value: 'fabric', label: 'أقمشة' },
  { value: 'supplies', label: 'مستلزمات' },
  { value: 'salaries', label: 'رواتب' },
  { value: 'other', label: 'أخرى' },
]

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    category: 'other' as const,
    description: '',
    amount: '',
    expense_date: new Date().toISOString().split('T')[0],
    branch_id: 1,
    note: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchExpenses() }, [])

  const fetchExpenses = async () => {
    try {
      const res = await fetch('/api/expenses')
      const json = await res.json()
      setExpenses(json.expenses || [])
    } catch (error) {
      console.error('Error fetching expenses:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, amount: parseFloat(formData.amount) }),
      })
      if (!res.ok) throw new Error('فشل حفظ المصروف')
      setFormData({ category: 'other', description: '', amount: '', expense_date: new Date().toISOString().split('T')[0], branch_id: 1, note: '' })
      setShowForm(false)
      fetchExpenses()
    } catch (error) {
      console.error('Error:', error)
      alert('فشل حفظ المصروف')
    } finally {
      setSaving(false)
    }
  }

  const filteredExpenses = expenses.filter(expense => {
    if (categoryFilter !== 'all' && expense.category !== categoryFilter) return false
    if (!search) return true
    const searchLower = search.toLowerCase()
    return expense.description?.toLowerCase().includes(searchLower) || expense.note?.toLowerCase().includes(searchLower)
  })

  const totalAmount = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0)

  const byCategory = CATEGORIES.reduce((acc, cat) => {
    const total = filteredExpenses.filter(e => e.category === cat.value).reduce((sum, e) => sum + (e.amount || 0), 0)
    if (total > 0) acc.push({ ...cat, total })
    return acc
  }, [] as Array<{ value: string; label: string; total: number }>)

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title">المصروفات</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 min-h-[44px] px-4 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-primary-hover font-semibold"
        >
          <Plus className="w-5 h-5" />
          إضافة مصروف
        </button>
      </div>

      {showForm && (
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">مصروف جديد</h2>
            <button onClick={() => setShowForm(false)} className="p-2 hover:bg-bg-tertiary rounded min-h-[44px] min-w-[44px] flex items-center justify-center">
              <X className="w-5 h-5 text-text-muted" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">الفئة</label>
              <select
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value as any })}
                className="w-full px-3 py-2 min-h-[44px] border border-border-primary rounded-lg bg-bg-input text-text-primary"
                required
              >
                {CATEGORIES.map(cat => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">المبلغ (ر.س)</label>
              <input type="number" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} className="w-full px-3 py-2 min-h-[44px] border border-border-primary rounded-lg bg-bg-input text-text-primary" required min={0} step={0.01} />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">الوصف</label>
              <input type="text" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full px-3 py-2 min-h-[44px] border border-border-primary rounded-lg bg-bg-input text-text-primary" required placeholder="وصف المصروف..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">التاريخ</label>
              <input type="date" value={formData.expense_date} onChange={e => setFormData({ ...formData, expense_date: e.target.value })} className="w-full px-3 py-2 min-h-[44px] border border-border-primary rounded-lg bg-bg-input text-text-primary" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">الفرع</label>
              <select value={formData.branch_id} onChange={e => setFormData({ ...formData, branch_id: parseInt(e.target.value) })} className="w-full px-3 py-2 min-h-[44px] border border-border-primary rounded-lg bg-bg-input text-text-primary">
                <option value={1}>الميرة</option>
                <option value={2}>الشارع التجاري</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">ملاحظة</label>
              <input type="text" value={formData.note} onChange={e => setFormData({ ...formData, note: e.target.value })} className="w-full px-3 py-2 min-h-[44px] border border-border-primary rounded-lg bg-bg-input text-text-primary" placeholder="اختياري" />
            </div>
            <div className="md:col-span-2 flex justify-end gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 min-h-[44px] text-text-secondary hover:bg-bg-tertiary rounded-lg">إلغاء</button>
              <button type="submit" disabled={saving} className="px-6 py-2 min-h-[44px] bg-accent-primary text-white rounded-lg hover:bg-accent-primary-hover disabled:opacity-50 font-semibold">
                {saving ? 'جاري الحفظ...' : 'حفظ'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="kpi-card">
          <p className="kpi-title">إجمالي المصروفات</p>
          <p className="kpi-value text-accent-danger">{totalAmount.toLocaleString('ar-SA')} ر.س</p>
        </div>
        {byCategory.slice(0, 3).map(cat => (
          <div key={cat.value} className="kpi-card">
            <p className="kpi-title">{cat.label}</p>
            <p className="kpi-value">{cat.total.toLocaleString('ar-SA')} ر.س</p>
          </div>
        ))}
      </div>

      <div className="filter-bar">
        <div className="flex-1 relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
          <input type="text" placeholder="بحث بالوصف أو الملاحظة..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pr-10 pl-4 py-2 min-h-[44px] border border-border-primary rounded-lg bg-bg-input text-text-primary focus:ring-2 focus:ring-accent-primary focus:border-accent-primary" />
        </div>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="px-4 py-2 min-h-[44px] border border-border-primary rounded-lg bg-bg-input text-text-primary focus:ring-2 focus:ring-accent-primary">
          <option value="all">جميع الفئات</option>
          {CATEGORIES.map(cat => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-accent-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredExpenses.length === 0 ? (
        <div className="text-center py-12 bg-bg-card rounded-xl border border-border-primary">
          <p className="text-text-tertiary">{search || categoryFilter !== 'all' ? 'لا توجد نتائج' : 'لا توجد مصروفات'}</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-scroll">
            <table className="w-full">
              <thead style={{ background: 'var(--bg-tertiary)' }}>
                <tr>
                  <th className="text-right py-3 px-4 text-sm font-medium text-text-muted">التاريخ</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-text-muted">الفئة</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-text-muted">الوصف</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-text-muted">الفرع</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">المبلغ</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((expense) => (
                  <tr key={expense.id} className="data-row hover:bg-bg-card-hover">
                    <td className="py-3 px-4 text-text-secondary">{new Date(expense.expense_date).toLocaleDateString('ar-SA')}</td>
                    <td className="py-3 px-4">
                      <span className="status-badge" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                        {expense.category_name || expense.category}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-text-primary">{expense.description}</p>
                        {expense.note && <p className="text-xs text-text-tertiary mt-1">{expense.note}</p>}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center text-text-secondary">{expense.branch_id === 1 ? 'الميرة' : 'الشارع التجاري'}</td>
                    <td className="py-3 px-4 font-bold text-accent-danger">{expense.amount.toLocaleString('ar-SA')} ر.س</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AppShell>
  )
}
