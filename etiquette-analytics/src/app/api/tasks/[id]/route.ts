// API للمهمة الواحدة
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const { data, error } = await supabase
      .from('order_tasks')
      .select(`
        *,
        order:orders(
          order_number,
          customer:customers(name),
          piece_type,
          branch_id
        )
      `)
      .eq('id', id)
      .single()

    if (error) throw error

    // جلب بيانات العامل
    let worker = null
    if (data.assigned_to) {
      const { data: workerData } = await supabase
        .from('users')
        .select('name')
        .eq('id', data.assigned_to)
        .single()
      worker = workerData
    }

    // جلب بيانات العنصر إذا وجد
    let order_item = null
    if (data.order_item_id) {
      const { data: itemData } = await supabase
        .from('order_items')
        .select('piece_type, quantity')
        .eq('id', data.order_item_id)
        .single()
      order_item = itemData
    }

    return NextResponse.json({ task: { ...data, worker, order_item } })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const body = await request.json()
    const updates: any = {}

    if (body.status !== undefined) {
      updates.status = body.status

      if (body.status === 'in_progress' && !body.started_at) {
        updates.started_at = new Date().toISOString()
      }
      if (body.status === 'done' && !body.completed_at) {
        updates.completed_at = new Date().toISOString()
      }
      if (body.status === 'pending') {
        updates.started_at = null
        updates.completed_at = null
      }
    }

    if (body.assigned_to !== undefined) {
      updates.assigned_to = body.assigned_to
    }

    if (body.wage_amount !== undefined) {
      updates.wage_amount = body.wage_amount
    }

    if (body.notes !== undefined) {
      updates.notes = body.notes
    }

    const { data, error } = await supabase
      .from('order_tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ task: data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const { error } = await supabase
      .from('order_tasks')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
