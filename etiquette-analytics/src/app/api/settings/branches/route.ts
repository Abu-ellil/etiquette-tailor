// API للفروع
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('branches')
      .select('*')
      .order('id', { ascending: true })

    if (error) throw error

    return NextResponse.json({ branches: data || [] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
