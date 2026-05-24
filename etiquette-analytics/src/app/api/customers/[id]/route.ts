// API لإدارة عميل محدد
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/customers/[id] - جلب تفاصيل عميل مع طلباته
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  // جلب بيانات العميل
  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .select('*')
    .eq('id', parseInt(id))
    .single()

  if (customerError) {
    return NextResponse.json(
      { error: `خطأ في جلب العميل: ${customerError.message}` },
      { status: 404 }
    )
  }

  // جلب طلبات العميل
  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .eq('customer_id', parseInt(id))
    .order('created_at', { ascending: false })

  // حساب إجمالي الرصيد
  const totalBalance = (orders || []).reduce(
    (sum, order) => sum + (order.price - order.paid),
    0
  )

  return NextResponse.json({
    customer,
    orders: orders || [],
    totalBalance,
  })
}

// PUT /api/customers/[id] - تحديث عميل
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const body = await request.json()

    const { data, error } = await supabase
      .from('customers')
      .update({
        name: body.name,
        phone: body.phone,
        notes: body.notes,
        branch_id: body.branch_id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', parseInt(id))
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: `خطأ في تحديث العميل: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ customer: data })
  } catch (error) {
    return NextResponse.json(
      { error: 'خطأ في معالجة الطلب' },
      { status: 500 }
    )
  }
}

// DELETE /api/customers/[id] - حذف عميل مع طلباته
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const customerId = parseInt(id)

  // جلب طلبات العميل
  const { data: orders } = await supabase
    .from('orders')
    .select('id')
    .eq('customer_id', customerId)

  if (orders && orders.length > 0) {
    const orderIds = orders.map((o) => o.id)

    // جلب عناصر الطلبات
    const { data: items } = await supabase
      .from('order_items')
      .select('id')
      .in('order_id', orderIds)

    if (items && items.length > 0) {
      const itemIds = items.map((i) => i.id)
      // حذف مهام عناصر الطلبات
      await supabase.from('order_tasks').delete().in('order_item_id', itemIds)
      // حذف عناصر الطلبات
      await supabase.from('order_items').delete().in('order_id', orderIds)
    }

    // حذف باقي البيانات المرتبطة بالطلبات
    await supabase.from('order_tasks').delete().in('order_id', orderIds)
    await supabase.from('order_payments').delete().in('order_id', orderIds)
    await supabase.from('order_measurements').delete().in('order_id', orderIds)
    // حذف الطلبات
    await supabase.from('orders').delete().in('id', orderIds)
  }

  // حذف العميل
  const { error } = await supabase
    .from('customers')
    .delete()
    .eq('id', customerId)

  if (error) {
    return NextResponse.json(
      { error: `خطأ في حذف العميل: ${error.message}` },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}
