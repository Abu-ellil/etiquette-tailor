// API للعمال
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const branchId = searchParams.get('branch_id')
    const role = searchParams.get('role')

    let query = supabase
      .from('users')
      .select('*')
      .eq('active', 1)
      .order('name', { ascending: true })

    if (branchId) {
      query = query.eq('branch_id', branchId)
    }

    if (role) {
      query = query.eq('role', role)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ workers: data || [] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
