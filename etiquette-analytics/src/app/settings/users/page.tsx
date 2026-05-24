// صفحة إدارة المستخدمين
'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Search } from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'
import { useRouter } from 'next/navigation'

interface User {
  id: number
  name: string
  username: string
  role: 'admin' | 'manager' | 'reception' | 'worker'
  worker_type: 'tailor' | 'master_cutter' | null
  branch_id: number
  base_salary: number | null
  default_rate: number | null
  active: number
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'مدير النظام',
  manager: 'مدير',
  reception: 'استقبال',
  worker: 'عامل',
}

const WORKER_TYPE_LABELS: Record<string, string> = {
  tailor: 'خياط',
  master_cutter: 'مستشار قص',
}

const BRANCH_LABELS: Record<number, string> = {
  1: 'الميرة',
  2: 'الشارع التجاري',
}

export default function UsersSettingsPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    role: 'worker' as const,
    worker_type: null as string | null,
    branch_id: 1,
    base_salary: '',
    default_rate: '',
    active: 1,
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/settings/users')
      const json = await res.json()
      setUsers(json.users || [])
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const res = await fetch('/api/settings/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          base_salary: formData.base_salary ? parseFloat(formData.base_salary) : null,
          default_rate: formData.default_rate ? parseFloat(formData.default_rate) : null,
        }),
      })

      if (!res.ok) throw new Error('فشل حفظ المستخدم')

      setFormData({
        name: '',
        username: '',
        role: 'worker',
        worker_type: null,
        branch_id: 1,
        base_salary: '',
        default_rate: '',
        active: 1,
      })
      setShowForm(false)
      fetchUsers()
    } catch (error) {
      console.error('Error:', error)
      alert('فشل حفظ المستخدم')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (userId: number, currentActive: number) => {
    try {
      const res = await fetch(`/api/settings/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: currentActive ? 0 : 1 }),
      })
      if (res.ok) {
        fetchUsers()
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const filteredUsers = users.filter(user => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      user.name?.toLowerCase().includes(searchLower) ||
      user.username?.toLowerCase().includes(searchLower)
    )
  })

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">المستخدمين</h1>
            <p className="text-sm text-gray-500 mt-1">إدارة صلاحيات المستخدمين والعمال</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-5 h-5" />
            إضافة مستخدم
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">مستخدم جديد</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الاسم</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم المستخدم</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={e => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الدور</label>
                <select
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                >
                  <option value="admin">مدير النظام</option>
                  <option value="manager">مدير</option>
                  <option value="reception">استقبال</option>
                  <option value="worker">عامل</option>
                </select>
              </div>

              {formData.role === 'worker' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">نوع العامل</label>
                    <select
                      value={formData.worker_type || ''}
                      onChange={e => setFormData({ ...formData, worker_type: e.target.value || null })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">-- اختياري --</option>
                      <option value="tailor">خياط</option>
                      <option value="master_cutter">مستشار قص</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">الراتب الأساسي</label>
                    <input
                      type="number"
                      value={formData.base_salary}
                      onChange={e => setFormData({ ...formData, base_salary: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="اختياري"
                      step={0.01}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">النسبة المئوية الافتراضية</label>
                    <input
                      type="number"
                      value={formData.default_rate}
                      onChange={e => setFormData({ ...formData, default_rate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="اختياري"
                      step={0.1}
                    />
                  </div>
                </>
              )}

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

              <div className="flex items-end gap-3 md:col-span-3">
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
              placeholder="بحث بالاسم أو اسم المستخدم..."
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
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">الاسم</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">اسم المستخدم</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">الدور</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">الفرع</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">الحالة</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{user.name}</td>
                    <td className="py-3 px-4 text-gray-600" dir="ltr">{user.username}</td>
                    <td className="py-3 px-4">
                      <div>
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                          {ROLE_LABELS[user.role]}
                        </span>
                        {user.worker_type && (
                          <span className="mr-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs">
                            {WORKER_TYPE_LABELS[user.worker_type]}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center text-gray-600">
                      {BRANCH_LABELS[user.branch_id]}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => toggleActive(user.id, user.active)}
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          user.active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {user.active ? 'نشط' : 'معطل'}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => router.push(`/settings/users/${user.id}/edit`)}
                        className="p-2 hover:bg-gray-100 rounded"
                      >
                        <Edit2 className="w-4 h-4 text-gray-400" />
                      </button>
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
