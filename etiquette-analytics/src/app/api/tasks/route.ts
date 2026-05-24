// API للمهام
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const taskType = searchParams.get('task_type')
    const branchId = searchParams.get('branch_id')

    let query = supabase
      .from('order_tasks')
      .select(`
        *,
        order:orders(
          order_number,
          customer:customers(name),
          piece_type
        )
      `)
      .order('id', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }
    if (taskType) {
      query = query.eq('task_type', taskType)
    }

    const { data, error } = await query

    if (error) throw error

    // جلب أسماء العمال بشكل منفصل
    const tasks = await Promise.all((data || []).map(async (task: any) => {
      let worker = null
      if (task.assigned_to) {
        const { data: workerData } = await supabase
          .from('users')
          .select('name')
          .eq('id', task.assigned_to)
          .single()
        worker = workerData
      }
      return { ...task, worker }
    }))

    return NextResponse.json({ tasks })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { order_id, order_item_id, task_type, assigned_to, wage_type, wage_rate, wage_amount, task_quantity, notes } = body

    const { data, error } = await supabase
      .from('order_tasks')
      .insert({
        order_id,
        order_item_id,
        task_type,
        assigned_to,
        wage_type: wage_type || 'fixed',
        wage_rate: wage_rate || 0,
        wage_amount: wage_amount || 0,
        task_quantity: task_quantity || 1,
        status: 'pending',
        notes,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ task: data }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
