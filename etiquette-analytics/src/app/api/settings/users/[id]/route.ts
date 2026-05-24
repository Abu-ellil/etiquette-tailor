// API للمستخدم الواحد
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error

    return NextResponse.json({ user: data })
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
    const { name, username, role, worker_type, branch_id, base_salary, default_rate, active } = body

    const updates: any = {}
    if (name !== undefined) updates.name = name
    if (username !== undefined) updates.username = username
    if (role !== undefined) updates.role = role
    if (worker_type !== undefined) updates.worker_type = worker_type
    if (branch_id !== undefined) updates.branch_id = branch_id
    if (base_salary !== undefined) updates.base_salary = base_salary
    if (default_rate !== undefined) updates.default_rate = default_rate
    if (active !== undefined) updates.active = active

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ user: data })
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
      .from('users')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
