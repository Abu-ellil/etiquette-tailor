// صفحة المصروفات
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Plus, X } from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'

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
  const router = useRouter()
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

  useEffect(() => {
    fetchExpenses()
  }, [])

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
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount),
        }),
      })

      if (!res.ok) throw new Error('فشل حفظ المصروف')

      setFormData({
        category: 'other',
        description: '',
        amount: '',
        expense_date: new Date().toISOString().split('T')[0],
        branch_id: 1,
        note: '',
      })
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
    return (
      expense.description?.toLowerCase().includes(searchLower) ||
      expense.note?.toLowerCase().includes(searchLower)
    )
  })

  const totalAmount = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0)

  // تجميع حسب الفئة
  const byCategory = CATEGORIES.reduce((acc, cat) => {
    const total = filteredExpenses
      .filter(e => e.category === cat.value)
      .reduce((sum, e) => sum + (e.amount || 0), 0)
    if (total > 0) {
      acc.push({ ...cat, total })
    }
    return acc
  }, [] as Array<{ value: string; label: string; total: number }>)

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">المصروفات</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-5 h-5" />
            إضافة مصروف
          </button>
        </div>

        {/* نموذج إضافة مصروف */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">مصروف جديد</h2>
              <button
                onClick={() => setShowForm(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الفئة</label>
                <select
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">المبلغ (ر.س)</label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={e => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                  min={0}
                  step={0.01}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الوصف</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                  placeholder="وصف المصروف..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">التاريخ</label>
                <input
                  type="date"
                  value={formData.expense_date}
                  onChange={e => setFormData({ ...formData, expense_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الفرع</label>
                <select
                  value={formData.branch_id}
                  onChange={e => setFormData({ ...formData, branch_id: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value={1}>الميرة</option>
                  <option value={2}>الشارع التجاري</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظة</label>
                <input
                  type="text"
                  value={formData.note}
                  onChange={e => setFormData({ ...formData, note: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="اختياري"
                />
              </div>

              <div className="md:col-span-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'جاري الحفظ...' : 'حفظ'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* إحصائيات */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <p className="text-sm text-gray-500 mb-1">إجمالي المصروفات</p>
            <p className="text-2xl font-bold text-red-600">
              {totalAmount.toLocaleString('ar-SA')} ر.س
            </p>
          </div>

          {byCategory.slice(0, 3).map(cat => (
            <div key={cat.value} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <p className="text-sm text-gray-500 mb-1">{cat.label}</p>
              <p className="text-xl font-bold text-gray-900">
                {cat.total.toLocaleString('ar-SA')} ر.س
              </p>
            </div>
          ))}
        </div>

        {/* الفلاتر والبحث */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="بحث بالوصف أو الملاحظة..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">جميع الفئات</option>
              {CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* قائمة المصروفات */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl">
            <p className="text-gray-500">
              {search || categoryFilter !== 'all' ? 'لا توجد نتائج' : 'لا توجد مصروفات'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">التاريخ</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">الفئة</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">الوصف</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">الفرع</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">المبلغ</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((expense) => (
                  <tr key={expense.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-600">
                      {new Date(expense.expense_date).toLocaleDateString('ar-SA')}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                        {expense.category_name || expense.category}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium">{expense.description}</p>
                        {expense.note && (
                          <p className="text-xs text-gray-500 mt-1">{expense.note}</p>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center text-gray-600">
                      {expense.branch_id === 1 ? 'الميرة' : 'الشارع التجاري'}
                    </td>
                    <td className="py-3 px-4 font-bold text-red-600">
                      {expense.amount.toLocaleString('ar-SA')} ر.س
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
