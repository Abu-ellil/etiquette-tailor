// صفحة إضافة عميل جديد
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'

export default function NewCustomerPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    notes: '',
    branch_id: 1,
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!res.ok) throw new Error('فشل حفظ العميل')

      router.push('/customers')
    } catch (error) {
      console.error('Error:', error)
      alert('فشل حفظ العميل')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-bg-tertiary rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <ArrowRight className="w-5 h-5 text-text-secondary" />
          </button>
          <h1 className="page-title">عميل جديد</h1>
        </div>

        {/* Form */}
        <div className="bg-bg-card rounded-xl shadow-sm border border-border-primary p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* الاسم */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                اسم العميل *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 bg-bg-input border border-border-primary rounded-lg focus:ring-2 focus:ring-accent-primary focus:border-accent-primary text-text-primary min-h-[44px]"
                required
                autoFocus
              />
            </div>

            {/* رقم الهاتف */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                رقم الهاتف *
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 bg-bg-input border border-border-primary rounded-lg focus:ring-2 focus:ring-accent-primary focus:border-accent-primary text-text-primary min-h-[44px]"
                required
                dir="ltr"
              />
            </div>

            {/* الفرع */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                الفرع
              </label>
              <select
                value={formData.branch_id}
                onChange={e => setFormData({ ...formData, branch_id: parseInt(e.target.value) })}
                className="w-full px-3 py-2 bg-bg-input border border-border-primary rounded-lg focus:ring-2 focus:ring-accent-primary focus:border-accent-primary text-text-primary min-h-[44px]"
              >
                <option value={1}>الميرة — أم قرن</option>
                <option value={2}>الشارع التجاري — أم قرن</option>
              </select>
            </div>

            {/* الملاحظات */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                ملاحظات
              </label>
              <textarea
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 bg-bg-input border border-border-primary rounded-lg focus:ring-2 focus:ring-accent-primary focus:border-accent-primary text-text-primary"
                placeholder="أي ملاحظات عن العميل..."
              />
            </div>

            {/* الأزرار */}
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-4 py-2 text-text-secondary hover:bg-bg-tertiary rounded-lg min-h-[44px]"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-accent-primary text-text-inverse rounded-lg hover:bg-accent-primary-hover disabled:opacity-50 min-h-[44px]"
              >
                {saving ? 'جاري الحفظ...' : 'حفظ العميل'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppShell>
  )
}
