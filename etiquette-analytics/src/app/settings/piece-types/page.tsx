// صفحة إدارة أنواع القطع
'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit2, Search, Package } from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'
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
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">أنواع القطع</h1>
            <p className="text-sm text-gray-500 mt-1">إدارة أنواع القطع وأسعارها الأساسية</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-5 h-5" />
            إضافة قطعة
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">قطعة جديدة</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الاسم (عربي)</label>
                <input
                  type="text"
                  value={formData.name_ar}
                  onChange={e => setFormData({ ...formData, name_ar: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الاسم (إنجليزي)</label>
                <input
                  type="text"
                  value={formData.name_en}
                  onChange={e => setFormData({ ...formData, name_en: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">التصنيف</label>
                <select
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">السعر الأساسي (ر.س)</label>
                <input
                  type="number"
                  value={formData.base_price}
                  onChange={e => setFormData({ ...formData, base_price: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                  min={0}
                  step={0.01}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ترتيب العرض</label>
                <input
                  type="number"
                  value={formData.sort_order}
                  onChange={e => setFormData({ ...formData, sort_order: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  min={0}
                />
              </div>

              <div className="flex items-end gap-3 md:col-span-3 lg:col-span-2">
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

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="بحث بالاسم..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedByCategory).map(([category, pieces]) => (
              <div key={category} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {CATEGORY_LABELS[category]}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pieces.map((piece) => (
                    <div
                      key={piece.id}
                      className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${
                        !piece.active ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Package className="w-5 h-5 text-gray-400" />
                          <h4 className="font-medium">{piece.name_ar}</h4>
                        </div>
                        <button
                          onClick={() => toggleActive(piece.id, piece.active)}
                          className={`px-2 py-1 rounded-full text-xs ${
                            piece.active
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {piece.active ? 'نشط' : 'معطل'}
                        </button>
                      </div>
                      <p className="text-sm text-gray-500 mb-2" dir="ltr">{piece.name_en}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-blue-600">
                          {piece.base_price.toLocaleString('ar-SA')} ر.س
                        </span>
                        <button
                          onClick={() => router.push(`/settings/piece-types/${piece.id}/edit`)}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          <Edit2 className="w-4 h-4 text-gray-400" />
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
    </div>
  )
}
