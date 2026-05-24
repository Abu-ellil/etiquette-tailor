// API للمستخدمين
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('name', { ascending: true })

    if (error) throw error

    return NextResponse.json({ users: data || [] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, username, role, worker_type, branch_id, base_salary, default_rate, active } = body

    const { data, error } = await supabase
      .from('users')
      .insert({
        name,
        username,
        role,
        worker_type,
        branch_id,
        base_salary,
        default_rate,
        active: active ?? 1,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ user: data }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
