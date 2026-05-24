// صفحة إدارة الفروع
'use client'

import { useState, useEffect } from 'react'
import { Building2, MapPin, Phone, Edit2 } from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'
import { useRouter } from 'next/navigation'

interface Branch {
  id: string
  name: string
  prefix: string
}

export default function BranchesSettingsPage() {
  const router = useRouter()
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBranches()
  }, [])

  const fetchBranches = async () => {
    try {
      const res = await fetch('/api/settings/branches')
      const json = await res.json()
      setBranches(json.branches || [])
    } catch (error) {
      console.error('Error fetching branches:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">الفروع</h1>
          <p className="text-sm text-gray-500 mt-1">إدارة فروع المحل</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {branches.map((branch) => (
              <div
                key={branch.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="p-3 bg-blue-50 text-blue-700 rounded-lg">
                      <Building2 className="w-6 h-6" />
                    </span>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{branch.name}</h3>
                      <p className="text-sm text-gray-500">بادئة الطلب: {branch.prefix}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => router.push(`/settings/branches/${branch.id}/edit`)}
                    className="p-2 hover:bg-gray-100 rounded"
                  >
                    <Edit2 className="w-4 h-4 text-gray-400" />
                  </button>
                </div>

                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span>تفاصيل الموقع...</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    <span>رقم الهاتف...</span>
                  </div>
                </div>
              </div>
            ))}

            <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center text-center">
              <Building2 className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-gray-500 mb-1">إضافة فرع جديد</p>
              <p className="text-xs text-gray-400">ميزة قادمة</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
