// API لإدارة الطلبات
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import type { Order, CreateOrderInput } from '@/types/order'

// GET /api/orders - جلب قائمة الطلبات
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const branchId = searchParams.get('branch_id')
  const status = searchParams.get('status')
  const customerId = searchParams.get('customer_id')
  const limit = searchParams.get('limit')

  let query = supabase
    .from('orders')
    .select(`
      *,
      customer:customers(id, name, phone, branch_id),
      items:order_items(*),
      measurements:order_measurements(*),
      tasks:order_tasks(*),
      payments:order_payments(*)
    `)
    .order('updated_at', { ascending: false })

  if (branchId) {
    query = query.eq('branch_id', parseInt(branchId))
  }
  if (status) {
    query = query.eq('status', status)
  }
  if (customerId) {
    query = query.eq('customer_id', parseInt(customerId))
  }
  if (limit) {
    query = query.limit(parseInt(limit))
  }

  const { data, error } = await query

  if (error) {
    console.error('Supabase error:', error)
    return NextResponse.json(
      { error: `خطأ في جلب الطلبات: ${error.message}` },
      { status: 500 }
    )
  }

  return NextResponse.json({ orders: data || [] })
}

// POST /api/orders - إنشاء طلب جديد
export async function POST(request: NextRequest) {
  try {
    const body: CreateOrderInput = await request.json()

    // التحقق من الحقول المطلوبة
    if (!body.order_number || !body.branch_id || !body.customer_id) {
      return NextResponse.json(
        { error: 'الحقول المطلوبة: رقم الطلب، الفرع، العميل' },
        { status: 400 }
      )
    }

    // إنشاء الطلب
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_number: body.order_number,
        branch_id: body.branch_id,
        customer_id: body.customer_id,
        details: body.details,
        price: body.price,
        paid: body.paid || 0,
        payment_method: body.payment_method || 'cash',
        status: body.status || 'intake',
        receive_date: body.receive_date,
        delivery_date: body.delivery_date,
        fabric_source: body.fabric_source || 'customer',
      })
      .select()
      .single()

    if (orderError) {
      console.error('Error creating order:', orderError)
      return NextResponse.json(
        { error: `خطأ في إنشاء الطلب: ${orderError.message}` },
        { status: 500 }
      )
    }

    // إضافة القطع (Order Items)
    if (body.items && body.items.length > 0) {
      const itemsToInsert = body.items.map(item => ({
        ...item,
        order_id: order.id,
      }))

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(itemsToInsert)

      if (itemsError) {
        console.error('Error creating order items:', itemsError)
      }
    }

    // إضافة القياسات
    if (body.measurements) {
      const { error: measurementsError } = await supabase
        .from('order_measurements')
        .insert({
          ...body.measurements,
          order_id: order.id,
        })

      if (measurementsError) {
        console.error('Error creating measurements:', measurementsError)
      }
    }

    return NextResponse.json({ order }, { status: 201 })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'خطأ في معالجة الطلب' },
      { status: 500 }
    )
  }
}
