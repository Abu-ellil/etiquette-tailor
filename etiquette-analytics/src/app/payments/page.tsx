'use client'

import { useState, useEffect } from 'react'
import { Search } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'

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
    <AppShell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title">المدفوعات</h1>
      </div>

      <div className="kpi-grid gap-mb-mobile">
        <div className="kpi-card">
          <p className="kpi-title">إجمالي المدفوعات</p>
          <p className="kpi-value">{totalAmount.toLocaleString('ar-QA')} ر.ق</p>
        </div>
        <div className="kpi-card">
          <p className="kpi-title">نقداً</p>
          <p className="kpi-value text-accent-success">{cashTotal.toLocaleString('ar-QA')} ر.ق</p>
        </div>
        <div className="kpi-card">
          <p className="kpi-title">بطاقة</p>
          <p className="kpi-value text-accent-primary">{cardTotal.toLocaleString('ar-QA')} ر.ق</p>
        </div>
      </div>

      <div className="filter-bar">
        <div className="flex-1 relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
          <input
            type="text"
            placeholder="بحث برقم الطلب أو ملاحظة..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pr-10 pl-4 py-2 min-h-[44px] border border-border-primary rounded-lg bg-bg-input text-text-primary focus:ring-2 focus:ring-accent-primary focus:border-accent-primary"
          />
        </div>
        <select
          value={branchFilter}
          onChange={e => setBranchFilter(e.target.value)}
          className="px-4 py-2 min-h-[44px] border border-border-primary rounded-lg bg-bg-input text-text-primary focus:ring-2 focus:ring-accent-primary"
        >
          <option value="all">جميع الفروع</option>
          <option value="1">الميرة</option>
          <option value="2">الشارع التجاري</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-accent-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredPayments.length === 0 ? (
        <div className="text-center py-12 bg-bg-card rounded-xl border border-border-primary">
          <p className="text-text-tertiary">لا توجد مدفوعات</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-scroll">
            <table className="w-full">
              <thead style={{ background: 'var(--bg-tertiary)' }}>
                <tr>
                  <th className="text-right py-3 px-4 text-sm font-medium text-text-muted">رقم الطلب</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-text-muted">التاريخ</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-text-muted">الطريقة</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-text-muted">الملاحظة</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">المبلغ</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((payment) => (
                  <tr key={payment.id} className="data-row hover:bg-bg-card-hover">
                    <td className="py-3 px-4 font-medium text-text-primary">
                      #{payment.order?.order_number || '-'}
                    </td>
                    <td className="py-3 px-4 text-text-secondary">
                      {new Date(payment.created_at).toLocaleDateString('ar-QA')}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`status-badge ${
                        payment.method === 'cash'
                          ? ''
                          : ''
                      }`} style={{
                        background: payment.method === 'cash' ? 'var(--accent-success-light)' : 'var(--accent-info-light)',
                        color: payment.method === 'cash' ? 'var(--accent-success)' : 'var(--accent-info)',
                      }}>
                        {payment.method === 'cash' ? 'نقداً' : 'بطاقة'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-text-secondary text-sm">
                      {payment.note || '-'}
                    </td>
                    <td className="py-3 px-4 font-bold text-text-primary">
                      {payment.amount.toLocaleString('ar-QA')} ر.ق
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AppShell>
  )
}
