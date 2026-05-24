// نموذج إضافة/تعديل طلب
'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { Order, CreateOrderInput, OrderItem } from '@/types/order'
import { ORDER_STATUS_LABELS, type OrderStatus } from '@/types/order'

interface OrderFormProps {
  order?: Order
  initialCustomerId?: number | null
  onSuccess?: () => void
  onCancel?: () => void
}

export function OrderForm({ order, initialCustomerId, onSuccess, onCancel }: OrderFormProps) {
  const [formData, setFormData] = useState<CreateOrderInput>({
    order_number: order?.order_number || '',
    branch_id: order?.branch_id || 1,
    customer_id: initialCustomerId || order?.customer_id || 0,
    details: order?.details || '',
    price: order?.price || 0,
    paid: order?.paid || 0,
    payment_method: order?.payment_method || 'cash',
    status: order?.status || 'intake',
    receive_date: order?.receive_date || new Date().toISOString().split('T')[0],
    delivery_date: order?.delivery_date || '',
    fabric_source: order?.fabric_source || 'customer',
    items: order?.items || [],
    measurements: order?.measurements || {},
  })

  const [customers, setCustomers] = useState<any[]>([])
  const [pieceTypes, setPieceTypes] = useState<any[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/customers').then(r => r.json()),
      fetch('/api/piece-types').then(r => r.json()),
    ]).then(([customersData, pieceTypesData]) => {
      setCustomers(customersData.customers || [])
      setPieceTypes(pieceTypesData.pieceTypes || [])
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const url = order ? `/api/orders/${order.id}` : '/api/orders'
      const method = order ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!res.ok) throw new Error('فشل حفظ الطلب')
      onSuccess?.()
    } catch (error) {
      console.error('Error:', error)
      alert('فشل حفظ الطلب')
    } finally {
      setSaving(false)
    }
  }

  const addItem = () => {
    setFormData({
      ...formData,
      items: [
        ...(formData.items || []),
        {
          piece_type: '',
          quantity: 1,
          unit_price: 0,
          total_price: 0,
          fabric_source: 'customer',
          fabric_price: 0,
          sort_order: (formData.items?.length || 0),
        },
      ],
    })
  }

  const updateItem = (index: number, field: keyof OrderItem, value: any) => {
    const newItems = [...(formData.items || [])]
    newItems[index] = { ...newItems[index], [field]: value }

    if (field === 'quantity' || field === 'unit_price') {
      newItems[index].total_price = newItems[index].quantity * newItems[index].unit_price
    }

    setFormData({ ...formData, items: newItems })
  }

  const removeItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items?.filter((_, i) => i !== index),
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* معلومات أساسية */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            رقم الطلب
          </label>
          <input
            type="text"
            value={formData.order_number}
            onChange={e => setFormData({ ...formData, order_number: e.target.value })}
            className="w-full min-h-[44px] px-3 py-2 border border-border-primary rounded-lg bg-bg-card text-text-primary focus:ring-2 focus:ring-accent-primary focus:border-accent-primary"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            الفرع
          </label>
          <select
            value={formData.branch_id}
            onChange={e => setFormData({ ...formData, branch_id: parseInt(e.target.value) })}
            className="w-full min-h-[44px] px-3 py-2 border border-border-primary rounded-lg bg-bg-card text-text-primary focus:ring-2 focus:ring-accent-primary focus:border-accent-primary"
          >
            <option value={1}>الميرة — أم قرن</option>
            <option value={2}>الشارع التجاري — أم قرن</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            العميل
          </label>
          <select
            value={formData.customer_id}
            onChange={e => setFormData({ ...formData, customer_id: parseInt(e.target.value) })}
            className="w-full min-h-[44px] px-3 py-2 border border-border-primary rounded-lg bg-bg-card text-text-primary focus:ring-2 focus:ring-accent-primary focus:border-accent-primary"
            required
          >
            <option value={0}>اختر العميل</option>
            {customers.map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.name} - {c.phone}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* القطع */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-text-secondary">القطع</h3>
          <button
            type="button"
            onClick={addItem}
            className="flex items-center gap-1 min-h-[44px] text-sm text-accent-primary hover:text-accent-primary-hover"
          >
            <Plus className="w-4 h-4" />
            إضافة قطعة
          </button>
        </div>

        <div className="space-y-3">
          {formData.items?.map((item, index) => (
            <div key={index} className="flex items-start gap-3 p-3 bg-bg-secondary rounded-lg">
              <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-2">
                <select
                  value={item.piece_type}
                  onChange={e => updateItem(index, 'piece_type', e.target.value)}
                  className="min-h-[44px] px-2 py-1.5 border border-border-primary rounded text-sm bg-bg-card text-text-primary"
                >
                  <option value="">نوع القطعة</option>
                  {pieceTypes.map((p: any) => (
                    <option key={p.id} value={p.name_en}>
                      {p.name_ar}
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  placeholder="الكمية"
                  value={item.quantity}
                  onChange={e => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                  className="min-h-[44px] px-2 py-1.5 border border-border-primary rounded text-sm bg-bg-card text-text-primary"
                  min={1}
                />

                <input
                  type="number"
                  placeholder="السعر"
                  value={item.unit_price}
                  onChange={e => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                  className="min-h-[44px] px-2 py-1.5 border border-border-primary rounded text-sm bg-bg-card text-text-primary"
                  min={0}
                  step={0.01}
                />

                <div className="text-sm font-medium text-text-secondary py-1.5">
                  {item.total_price} ر.ق
                </div>
              </div>

              <button
                type="button"
                onClick={() => removeItem(index)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center p-1 text-accent-danger hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* القياسات */}
      <div>
        <h3 className="text-sm font-medium text-text-secondary mb-2">القياسات</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { key: 'chest', label: 'الصدر' },
            { key: 'waist', label: 'الخصر' },
            { key: 'hips', label: 'الأرداف' },
            { key: 'length', label: 'الطول' },
            { key: 'sleeve', label: 'الكم' },
            { key: 'shoulder', label: 'الكتف' },
          ].map(field => (
            <div key={field.key}>
              <label className="block text-xs text-text-secondary mb-1">{field.label}</label>
              <input
                type="number"
                value={(formData.measurements as any)?.[field.key] || ''}
                onChange={e =>
                  setFormData({
                    ...formData,
                    measurements: {
                      ...formData.measurements,
                      [field.key]: parseFloat(e.target.value) || 0,
                    },
                  })
                }
                className="w-full min-h-[44px] px-2 py-1.5 border border-border-primary rounded text-sm bg-bg-card text-text-primary"
                step={0.5}
              />
            </div>
          ))}
        </div>
      </div>

      {/* المعلومات المالية */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            السعر الإجمالي
          </label>
          <input
            type="number"
            value={formData.price}
            onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
            className="w-full min-h-[44px] px-3 py-2 border border-border-primary rounded-lg bg-bg-card text-text-primary"
            min={0}
            step={0.01}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            المبلغ المدفوع
          </label>
          <input
            type="number"
            value={formData.paid}
            onChange={e => setFormData({ ...formData, paid: parseFloat(e.target.value) || 0 })}
            className="w-full min-h-[44px] px-3 py-2 border border-border-primary rounded-lg bg-bg-card text-text-primary"
            min={0}
            step={0.01}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            طريقة الدفع
          </label>
          <select
            value={formData.payment_method}
            onChange={e => setFormData({ ...formData, payment_method: e.target.value as any })}
            className="w-full min-h-[44px] px-3 py-2 border border-border-primary rounded-lg bg-bg-card text-text-primary"
          >
            <option value="cash">نقداً</option>
            <option value="card">بطاقة</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            الحالة
          </label>
          <select
            value={formData.status}
            onChange={e => setFormData({ ...formData, status: e.target.value as OrderStatus })}
            className="w-full min-h-[44px] px-3 py-2 border border-border-primary rounded-lg bg-bg-card text-text-primary"
          >
            {Object.entries(ORDER_STATUS_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* التواريخ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            تاريخ الاستلام
          </label>
          <input
            type="date"
            value={formData.receive_date}
            onChange={e => setFormData({ ...formData, receive_date: e.target.value })}
            className="w-full min-h-[44px] px-3 py-2 border border-border-primary rounded-lg bg-bg-card text-text-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            تاريخ التسليم المحدد
          </label>
          <input
            type="date"
            value={formData.delivery_date}
            onChange={e => setFormData({ ...formData, delivery_date: e.target.value })}
            className="w-full min-h-[44px] px-3 py-2 border border-border-primary rounded-lg bg-bg-card text-text-primary"
          />
        </div>
      </div>

      {/* ملاحظات */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">
          ملاحظات
        </label>
        <textarea
          value={formData.details}
          onChange={e => setFormData({ ...formData, details: e.target.value })}
          rows={2}
          className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-card text-text-primary"
          placeholder="أي تفاصيل إضافية..."
        />
      </div>

      {/* الأزرار */}
      <div className="flex justify-end gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[44px] px-4 py-2 text-text-secondary hover:bg-bg-tertiary rounded-lg"
          >
            إلغاء
          </button>
        )}
        <button
          type="submit"
          disabled={saving}
          className="min-h-[44px] px-6 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-primary-hover disabled:opacity-50"
        >
          {saving ? 'جاري الحفظ...' : order ? 'تحديث الطلب' : 'إنشاء الطلب'}
        </button>
      </div>
    </form>
  )
}
