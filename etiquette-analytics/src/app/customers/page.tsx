// صفحة قائمة العملاء
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Plus, Phone, Mail } from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'

interface Customer {
  id: number
  name: string
  phone: string
  notes?: string
  branch_id: number
  created_at: string
}

export default function CustomersPage() {
  const router = useRouter()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchCustomers()
  }, [])

  const fetchCustomers = async () => {
    try {
      const res = await fetch('/api/customers')
      const json = await res.json()
      setCustomers(json.customers || [])
    } catch (error) {
      console.error('Error fetching customers:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredCustomers = customers.filter(customer => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      customer.name?.toLowerCase().includes(searchLower) ||
      customer.phone?.includes(search)
    )
  })

  const branchNames: Record<number, string> = {
    1: 'الميرة',
    2: 'الشارع التجاري',
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header مع زر الإضافة */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">العملاء</h1>
          <button
            onClick={() => router.push('/customers/new')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-5 h-5" />
            إضافة عميل
          </button>
        </div>

        {/* البحث */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="بحث بالاسم أو رقم الهاتف..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* قائمة العملاء */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl">
            <p className="text-gray-500">
              {search ? 'لا توجد نتائج للبحث' : 'لا يوجد عملاء'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCustomers.map(customer => (
              <div
                key={customer.id}
                onClick={() => router.push(`/customers/${customer.id}`)}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 text-lg mb-1">
                      {customer.name}
                    </h3>
                    <div className="flex items-center gap-1 text-gray-600">
                      <Phone className="w-4 h-4" />
                      <span className="text-sm" dir="ltr">{customer.phone}</span>
                    </div>
                  </div>
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                    {branchNames[customer.branch_id] || customer.branch_id}
                  </span>
                </div>

                {customer.notes && (
                  <p className="text-sm text-gray-500 line-clamp-2 mt-2">
                    {customer.notes}
                  </p>
                )}

                <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400">
                  منذ {new Date(customer.created_at).toLocaleDateString('ar-SA')}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* إحصائيات */}
        {!loading && customers.length > 0 && (
          <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
              <p className="text-sm text-gray-500">إجمالي العملاء</p>
              <p className="text-2xl font-bold text-gray-900">{customers.length}</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
              <p className="text-sm text-gray-500">فرع الميرة</p>
              <p className="text-2xl font-bold text-gray-900">
                {customers.filter(c => c.branch_id === 1).length}
              </p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
              <p className="text-sm text-gray-500">فرع الشارع التجاري</p>
              <p className="text-2xl font-bold text-gray-900">
                {customers.filter(c => c.branch_id === 2).length}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
