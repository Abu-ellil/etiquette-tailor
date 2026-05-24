// API لنوع القطعة
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const body = await request.json()
    const updates: any = {}

    if (body.name_ar !== undefined) updates.name_ar = body.name_ar
    if (body.name_en !== undefined) updates.name_en = body.name_en
    if (body.category !== undefined) updates.category = body.category
    if (body.base_price !== undefined) updates.base_price = body.base_price
    if (body.sort_order !== undefined) updates.sort_order = body.sort_order
    if (body.active !== undefined) updates.active = body.active

    const { data, error } = await supabase
      .from('piece_types')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ piece_type: data })
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
      .from('piece_types')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
