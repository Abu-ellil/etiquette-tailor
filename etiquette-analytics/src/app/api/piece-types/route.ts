// API لأنواع القطع
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('piece_types')
      .select('*')
      .order('sort_order', { ascending: true })

    if (error) throw error

    return NextResponse.json({ piece_types: data || [] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name_en, name_ar, category, base_price, sort_order, active } = body

    const { data, error } = await supabase
      .from('piece_types')
      .insert({
        name_en,
        name_ar,
        category,
        base_price: base_price || 0,
        sort_order: sort_order || 0,
        active: active ?? 1,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ piece_type: data }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
