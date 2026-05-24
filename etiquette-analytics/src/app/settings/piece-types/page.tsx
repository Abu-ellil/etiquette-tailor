// صفحة إدارة أنواع القطع
'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit2, Search, Package } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { useRouter } from 'next/navigation'

interface PieceType {
  id: number
  name_en: string
  name_ar: string
  category: 'custom_wear' | 'abaya' | 'uniform' | 'alteration' | 'special'
  base_price: number
  active: number
  sort_order: number
}

const CATEGORY_LABELS: Record<string, string> = {
  custom_wear: 'أزياء مخصصة',
  abaya: 'عبايات',
  uniform: 'زي رسمي',
  alteration: 'تعديلات',
  special: 'خاص',
}

export default function PieceTypesSettingsPage() {
  const router = useRouter()
  const [pieceTypes, setPieceTypes] = useState<PieceType[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name_en: '',
    name_ar: '',
    category: 'custom_wear' as const,
    base_price: '',
    sort_order: '0',
    active: 1,
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchPieceTypes()
  }, [])

  const fetchPieceTypes = async () => {
    try {
      const res = await fetch('/api/piece-types')
      const json = await res.json()
      setPieceTypes(json.piece_types || json.pieceTypes || [])
    } catch (error) {
      console.error('Error fetching piece types:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const res = await fetch('/api/piece-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          base_price: parseFloat(formData.base_price) || 0,
          sort_order: parseInt(formData.sort_order) || 0,
        }),
      })

      if (!res.ok) throw new Error('فشل حفظ نوع القطعة')

      setFormData({
        name_en: '',
        name_ar: '',
        category: 'custom_wear',
        base_price: '',
        sort_order: '0',
        active: 1,
      })
      setShowForm(false)
      fetchPieceTypes()
    } catch (error) {
      console.error('Error:', error)
      alert('فشل حفظ نوع القطعة')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (id: number, currentActive: number) => {
    try {
      const res = await fetch(`/api/piece-types/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: currentActive ? 0 : 1 }),
      })
      if (res.ok) {
        fetchPieceTypes()
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const filteredPieceTypes = pieceTypes.filter(pt => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      pt.name_en?.toLowerCase().includes(searchLower) ||
      pt.name_ar?.includes(search)
    )
  })

  const groupedByCategory = filteredPieceTypes.reduce((acc, pt) => {
    if (!acc[pt.category]) acc[pt.category] = []
    acc[pt.category].push(pt)
    return acc
  }, {} as Record<string, PieceType[]>)

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">أنواع القطع</h1>
            <p className="text-sm text-text-tertiary mt-1">إدارة أنواع القطع وأسعارها الأساسية</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="min-h-[44px] flex items-center gap-2 px-4 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-primary-hover"
          >
            <Plus className="w-5 h-5" />
            إضافة قطعة
          </button>
        </div>

        {showForm && (
          <div className="bg-bg-card rounded-xl shadow-sm border border-border-primary p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">قطعة جديدة</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">الاسم (عربي)</label>
                <input
                  type="text"
                  value={formData.name_ar}
                  onChange={e => setFormData({ ...formData, name_ar: e.target.value })}
                  className="w-full px-3 py-2 border border-border-primary rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">الاسم (إنجليزي)</label>
                <input
                  type="text"
                  value={formData.name_en}
                  onChange={e => setFormData({ ...formData, name_en: e.target.value })}
                  className="w-full px-3 py-2 border border-border-primary rounded-lg"
                  required
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">التصنيف</label>
                <select
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value as any })}
                  className="w-full px-3 py-2 border border-border-primary rounded-lg"
                  required
                >
                  <option value="custom_wear">أزياء مخصصة</option>
                  <option value="abaya">عبايات</option>
                  <option value="uniform">زي رسمي</option>
                  <option value="alteration">تعديلات</option>
                  <option value="special">خاص</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">السعر الأساسي (ر.ق)</label>
                <input
                  type="number"
                  value={formData.base_price}
                  onChange={e => setFormData({ ...formData, base_price: e.target.value })}
                  className="w-full px-3 py-2 border border-border-primary rounded-lg"
                  required
                  min={0}
                  step={0.01}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">ترتيب العرض</label>
                <input
                  type="number"
                  value={formData.sort_order}
                  onChange={e => setFormData({ ...formData, sort_order: e.target.value })}
                  className="w-full px-3 py-2 border border-border-primary rounded-lg"
                  min={0}
                />
              </div>

              <div className="flex items-end gap-3 md:col-span-3 lg:col-span-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="min-h-[44px] px-4 py-2 text-text-secondary hover:bg-bg-tertiary rounded-lg"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="min-h-[44px] px-6 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-primary-hover disabled:opacity-50"
                >
                  {saving ? 'جاري الحفظ...' : 'حفظ'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-bg-card rounded-xl shadow-sm border border-border-primary p-4 mb-6">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
            <input
              type="text"
              placeholder="بحث بالاسم..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pr-10 pl-4 py-2 border border-border-primary rounded-lg focus:ring-2 focus:ring-accent-primary focus:border-accent-primary"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-accent-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedByCategory).map(([category, pieces]) => (
              <div key={category} className="bg-bg-card rounded-xl shadow-sm border border-border-primary p-6">
                <h3 className="text-lg font-semibold text-text-primary mb-4">
                  {CATEGORY_LABELS[category]}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pieces.map((piece) => (
                    <div
                      key={piece.id}
                      className={`border border-border-primary rounded-lg p-4 hover:shadow-md transition-shadow ${
                        !piece.active ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Package className="w-5 h-5 text-text-muted" />
                          <h4 className="font-medium text-text-primary">{piece.name_ar}</h4>
                        </div>
                        <button
                          onClick={() => toggleActive(piece.id, piece.active)}
                          className={`min-h-[44px] px-2 py-1 rounded-full text-xs ${
                            piece.active
                              ? 'bg-accent-success-light text-accent-success'
                              : 'bg-bg-tertiary text-text-tertiary'
                          }`}
                        >
                          {piece.active ? 'نشط' : 'معطل'}
                        </button>
                      </div>
                      <p className="text-sm text-text-tertiary mb-2" dir="ltr">{piece.name_en}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-accent-primary">
                          {piece.base_price.toLocaleString('ar-QA')} ر.ق
                        </span>
                        <button
                          onClick={() => router.push(`/settings/piece-types/${piece.id}/edit`)}
                          className="min-h-[44px] p-1 hover:bg-bg-tertiary rounded"
                        >
                          <Edit2 className="w-4 h-4 text-text-muted" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
