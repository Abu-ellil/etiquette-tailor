// صفحة تعديل عميل
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'

export default function EditCustomerPage() {
  const params = useParams()
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    notes: '',
    branch_id: 1,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchCustomer()
  }, [params.id])

  const fetchCustomer = async () => {
    try {
      const res = await fetch(`/api/customers/${params.id}`)
      const json = await res.json()
      setFormData({
        name: json.customer.name,
        phone: json.customer.phone,
        notes: json.customer.notes || '',
        branch_id: json.customer.branch_id,
      })
    } catch (error) {
      console.error('Error fetching customer:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const res = await fetch(`/api/customers/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!res.ok) throw new Error('فشل تحديث العميل')

      router.push(`/customers/${params.id}`)
    } catch (error) {
      console.error('Error:', error)
      alert('فشل تحديث العميل')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowRight className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">تعديل العميل</h1>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* الاسم */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                اسم العميل *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                autoFocus
              />
            </div>

            {/* رقم الهاتف */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                رقم الهاتف *
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                dir="ltr"
              />
            </div>

            {/* الفرع */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                الفرع
              </label>
              <select
                value={formData.branch_id}
                onChange={e => setFormData({ ...formData, branch_id: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={1}>الميرة — أم قرن</option>
                <option value={2}>الشارع التجاري — أم قرن</option>
              </select>
            </div>

            {/* الملاحظات */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ملاحظات
              </label>
              <textarea
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="أي ملاحظات عن العميل..."
              />
            </div>

            {/* الأزرار */}
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
