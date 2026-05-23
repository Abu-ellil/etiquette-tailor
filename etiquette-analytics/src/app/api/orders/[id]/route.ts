// API لإدارة طلب محدد
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import type { CreateOrderInput } from '@/types/order'

// GET /api/orders/[id] - جلب تفاصيل طلب محدد
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      customer:customers(id, name, phone, branch_id),
      items:order_items(*),
      measurements:order_measurements(*),
      tasks:order_tasks(*),
      payments:order_payments(*)
    `)
    .eq('id', parseInt(id))
    .single()

  if (error) {
    console.error('Supabase error:', error)
    return NextResponse.json(
      { error: `خطأ في جلب الطلب: ${error.message}` },
      { status: 404 }
    )
  }

  return NextResponse.json({ order: data })
}

// PUT /api/orders/[id] - تحديث طلب
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const body: Partial<CreateOrderInput> = await request.json()

    // تحديث الطلب
    const { data: order, error } = await supabase
      .from('orders')
      .update({
        order_number: body.order_number,
        branch_id: body.branch_id,
        customer_id: body.customer_id,
        details: body.details,
        price: body.price,
        paid: body.paid,
        payment_method: body.payment_method,
        status: body.status,
        receive_date: body.receive_date,
        delivery_date: body.delivery_date,
        fabric_source: body.fabric_source,
        updated_at: new Date().toISOString(),
      })
      .eq('id', parseInt(id))
      .select()
      .single()

    if (error) {
      console.error('Error updating order:', error)
      return NextResponse.json(
        { error: `خطأ في تحديث الطلب: ${error.message}` },
        { status: 500 }
      )
    }

    // تحديث القياسات
    if (body.measurements) {
      // التحقق من وجود قياسات سابقة
      const { data: existingMeasurements } = await supabase
        .from('order_measurements')
        .select('id')
        .eq('order_id', parseInt(id))
        .maybeSingle()

      if (existingMeasurements) {
        // تحديث القياسات الموجودة
        await supabase
          .from('order_measurements')
          .update(body.measurements)
          .eq('id', existingMeasurements.id)
      } else {
        // إضافة قياسات جديدة
        await supabase
          .from('order_measurements')
          .insert({
            ...body.measurements,
            order_id: parseInt(id),
          })
      }
    }

    return NextResponse.json({ order })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'خطأ في معالجة الطلب' },
      { status: 500 }
    )
  }
}

// DELETE /api/orders/[id] - حذف طلب
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { error } = await supabase
    .from('orders')
    .delete()
    .eq('id', parseInt(id))

  if (error) {
    console.error('Error deleting order:', error)
    return NextResponse.json(
      { error: `خطأ في حذف الطلب: ${error.message}` },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}

// PATCH /api/orders/[id]/status - تحديث حالة الطلب فقط
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const body = await request.json()

    const { data: order, error } = await supabase
      .from('orders')
      .update({
        status: body.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', parseInt(id))
      .select()
      .single()

    if (error) {
      console.error('Error updating order status:', error)
      return NextResponse.json(
        { error: `خطأ في تحديث الحالة: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ order })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'خطأ في معالجة الطلب' },
      { status: 500 }
    )
  }
}
