// صفحة إضافة طلب جديد
'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { OrderForm } from '@/components/orders/OrderForm'

function NewOrderContent() {
  const searchParams = useSearchParams()
  const [orderNumber, setOrderNumber] = useState('')
  const [prefilledCustomerId, setPrefilledCustomerId] = useState<number | null>(null)

  useEffect(() => {
    const date = new Date()
    const year = date.getFullYear().toString().slice(-2)
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    setOrderNumber(`ORD-${year}${month}-${random}`)

    const customerId = searchParams.get('customer_id')
    if (customerId) {
      setPrefilledCustomerId(parseInt(customerId))
    }
  }, [searchParams])

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-bg-card rounded-xl shadow-sm border border-border-primary p-6">
        <OrderForm
          initialCustomerId={prefilledCustomerId}
          onSuccess={() => {
            window.location.href = '/orders'
          }}
          onCancel={() => {
            window.location.href = '/orders'
          }}
        />
      </div>
    </div>
  )
}

export default function NewOrderPage() {
  return (
    <AppShell>
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-accent-primary border-t-transparent rounded-full animate-spin" />
        </div>
      }>
        <NewOrderContent />
      </Suspense>
    </AppShell>
  )
}
