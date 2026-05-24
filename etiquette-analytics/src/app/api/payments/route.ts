// API لإدارة المدفوعات
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export interface PaymentInput {
  order_id: number
  amount: number
  method: 'cash' | 'card'
  note?: string
  created_by?: number
}

// GET /api/payments - جلب قائمة المدفوعات
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const orderId = searchParams.get('order_id')
  const branchId = searchParams.get('branch_id')
  const startDate = searchParams.get('start_date')
  const endDate = searchParams.get('end_date')

  let query = supabase
    .from('order_payments')
    .select(`
      *,
      order:orders(id, order_number, customer_id, price)
    `)
    .order('created_at', { ascending: false })

  if (orderId) {
    query = query.eq('order_id', parseInt(orderId))
  }
  if (startDate) {
    query = query.gte('created_at', startDate)
  }
  if (endDate) {
    query = query.lte('created_at', endDate)
  }

  const { data, error } = await query

  if (error) {
    console.error('Supabase error:', error)
    return NextResponse.json(
      { error: `خطأ في جلب المدفوعات: ${error.message}` },
      { status: 500 }
    )
  }

  return NextResponse.json({ payments: data || [] })
}

// POST /api/payments - تسجيل دفعة جديدة
export async function POST(request: NextRequest) {
  try {
    const body: PaymentInput = await request.json()

    if (!body.order_id || !body.amount || !body.method) {
      return NextResponse.json(
        { error: 'الحقول المطلوبة: رقم الطلب، المبلغ، طريقة الدفع' },
        { status: 400 }
      )
    }

    // جلب معلومات الطلب
    const { data: order } = await supabase
      .from('orders')
      .select('paid')
      .eq('id', body.order_id)
      .single()

    if (!order) {
      return NextResponse.json(
        { error: 'الطلب غير موجود' },
        { status: 404 }
      )
    }

    // تسجيل الدفعة
    const { data: payment, error: paymentError } = await supabase
      .from('order_payments')
      .insert({
        order_id: body.order_id,
        amount: body.amount,
        method: body.method,
        note: body.note,
        created_by: body.created_by,
      })
      .select()
      .single()

    if (paymentError) {
      console.error('Error creating payment:', paymentError)
      return NextResponse.json(
        { error: `خطأ في تسجيل الدفعة: ${paymentError.message}` },
        { status: 500 }
      )
    }

    // تحديث المبلغ المدفوع في الطلب
    const newPaid = (order.paid || 0) + body.amount
    await supabase
      .from('orders')
      .update({ paid: newPaid })
      .eq('id', body.order_id)

    return NextResponse.json({ payment }, { status: 201 })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'خطأ في معالجة الطلب' },
      { status: 500 }
    )
  }
}
