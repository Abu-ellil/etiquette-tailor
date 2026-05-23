// صفحة إضافة طلب جديد
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'
import { OrderForm } from '@/components/orders/OrderForm'

export default function NewOrderPage() {
  const [orderNumber, setOrderNumber] = useState('')

  useEffect(() => {
    // توليد رقم طلب تلقائي
    const date = new Date()
    const year = date.getFullYear().toString().slice(-2)
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    setOrderNumber(`ORD-${year}${month}-${random}`)
  }, [])

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <OrderForm
            onSuccess={() => {
              window.location.href = '/orders'
            }}
            onCancel={() => {
              window.location.href = '/orders'
            }}
          />
        </div>
      </div>
    </div>
  )
}
