// صفحة قائمة العملاء
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Plus, Phone } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'

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
    <AppShell>
      {/* Header مع زر الإضافة */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title">العملاء</h1>
        <button
          onClick={() => router.push('/customers/new')}
          className="flex items-center gap-2 px-4 py-2 bg-accent-primary text-text-inverse rounded-lg hover:bg-accent-primary-hover min-h-[44px]"
        >
          <Plus className="w-5 h-5" />
          إضافة عميل
        </button>
      </div>

      {/* البحث */}
      <div className="bg-bg-card rounded-xl shadow-sm border border-border-primary p-4 mb-6">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
          <input
            type="text"
            placeholder="بحث بالاسم أو رقم الهاتف..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pr-10 pl-4 py-2 bg-bg-input border border-border-primary rounded-lg focus:ring-2 focus:ring-accent-primary focus:border-accent-primary text-text-primary"
          />
        </div>
      </div>

      {/* قائمة العملاء */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-accent-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="text-center py-12 bg-bg-card rounded-xl">
          <p className="text-text-tertiary">
            {search ? 'لا توجد نتائج للبحث' : 'لا يوجد عملاء'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map(customer => (
            <div
              key={customer.id}
              onClick={() => router.push(`/customers/${customer.id}`)}
              className="bg-bg-card rounded-xl shadow-sm border border-border-primary p-5 hover:shadow-md hover:bg-bg-card-hover transition-shadow cursor-pointer"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-text-primary text-lg mb-1">
                    {customer.name}
                  </h3>
                  <div className="flex items-center gap-1 text-text-secondary">
                    <Phone className="w-4 h-4" />
                    <span className="text-sm" dir="ltr">{customer.phone}</span>
                  </div>
                </div>
                <span className="px-2 py-1 bg-bg-tertiary text-text-secondary text-xs rounded-full">
                  {branchNames[customer.branch_id] || customer.branch_id}
                </span>
              </div>

              {customer.notes && (
                <p className="text-sm text-text-tertiary line-clamp-2 mt-2">
                  {customer.notes}
                </p>
              )}

              <div className="mt-3 pt-3 border-t border-border-primary text-xs text-text-muted">
                منذ {new Date(customer.created_at).toLocaleDateString('ar-SA')}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* إحصائيات */}
      {!loading && customers.length > 0 && (
        <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-bg-card rounded-lg p-4 shadow-sm border border-border-primary">
            <p className="text-sm text-text-tertiary">إجمالي العملاء</p>
            <p className="text-2xl font-bold text-text-primary">{customers.length}</p>
          </div>
          <div className="bg-bg-card rounded-lg p-4 shadow-sm border border-border-primary">
            <p className="text-sm text-text-tertiary">فرع الميرة</p>
            <p className="text-2xl font-bold text-text-primary">
              {customers.filter(c => c.branch_id === 1).length}
            </p>
          </div>
          <div className="bg-bg-card rounded-lg p-4 shadow-sm border border-border-primary">
            <p className="text-sm text-text-tertiary">فرع الشارع التجاري</p>
            <p className="text-2xl font-bold text-text-primary">
              {customers.filter(c => c.branch_id === 2).length}
            </p>
          </div>
        </div>
      )}
    </AppShell>
  )
}
