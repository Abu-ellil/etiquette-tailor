// صفحة المدفوعات
'use client'

import { useState, useEffect } from 'react'
import { Search, Filter, Plus, Calendar } from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'

export default function PaymentsPage() {
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [branchFilter, setBranchFilter] = useState<string>('all')

  useEffect(() => {
    fetchPayments()
  }, [])

  const fetchPayments = async () => {
    try {
      const res = await fetch('/api/payments')
      const json = await res.json()
      setPayments(json.payments || [])
    } catch (error) {
      console.error('Error fetching payments:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredPayments = payments.filter(payment => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      payment.order?.order_number?.toLowerCase().includes(searchLower) ||
      payment.note?.toLowerCase().includes(searchLower)
    )
  })

  const totalAmount = filteredPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
  const cashTotal = filteredPayments.filter(p => p.method === 'cash').reduce((sum, p) => sum + (p.amount || 0), 0)
  const cardTotal = filteredPayments.filter(p => p.method === 'card').reduce((sum, p) => sum + (p.amount || 0), 0)

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">المدفوعات</h1>
        </div>

        {/* إحصائيات سريعة */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <p className="text-sm text-gray-500 mb-1">إجمالي المدفوعات</p>
            <p className="text-2xl font-bold text-gray-900">
              {totalAmount.toLocaleString('ar-SA')} ر.س
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <p className="text-sm text-gray-500 mb-1">نقداً</p>
            <p className="text-2xl font-bold text-green-600">
              {cashTotal.toLocaleString('ar-SA')} ر.س
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <p className="text-sm text-gray-500 mb-1">بطاقة</p>
            <p className="text-2xl font-bold text-blue-600">
              {cardTotal.toLocaleString('ar-SA')} ر.س
            </p>
          </div>
        </div>

        {/* الفلاتر والبحث */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="بحث برقم الطلب أو ملاحظة..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <select
              value={branchFilter}
              onChange={e => setBranchFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">جميع الفروع</option>
              <option value="1">الميرة</option>
              <option value="2">الشارع التجاري</option>
            </select>
          </div>
        </div>

        {/* قائمة المدفوعات */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl">
            <p className="text-gray-500">لا توجد مدفوعات</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">رقم الطلب</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">التاريخ</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">الطريقة</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">الملاحظة</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">المبلغ</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((payment) => (
                  <tr key={payment.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">
                      #{payment.order?.order_number || '-'}
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {new Date(payment.created_at).toLocaleDateString('ar-SA')}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        payment.method === 'cash'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {payment.method === 'cash' ? 'نقداً' : 'بطاقة'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600 text-sm">
                      {payment.note || '-'}
                    </td>
                    <td className="py-3 px-4 font-bold text-gray-900">
                      {payment.amount.toLocaleString('ar-SA')} ر.س
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
