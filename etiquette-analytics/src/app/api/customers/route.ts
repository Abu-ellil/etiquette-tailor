// API لإدارة العملاء
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export interface CustomerInput {
  name: string
  phone: string
  notes?: string
  branch_id: number
}

// GET /api/customers - جلب قائمة العملاء
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const branchId = searchParams.get('branch_id')
  const search = searchParams.get('search')

  let query = supabase
    .from('customers')
    .select('*')
    .order('updated_at', { ascending: false })

  if (branchId) {
    query = query.eq('branch_id', parseInt(branchId))
  }

  if (search) {
    query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`)
  }

  const { data, error } = await query

  if (error) {
    console.error('Supabase error:', error)
    return NextResponse.json(
      { error: `خطأ في جلب العملاء: ${error.message}` },
      { status: 500 }
    )
  }

  return NextResponse.json({ customers: data || [] })
}

// POST /api/customers - إنشاء عميل جديد
export async function POST(request: NextRequest) {
  try {
    const body: CustomerInput = await request.json()

    if (!body.name || !body.phone || !body.branch_id) {
      return NextResponse.json(
        { error: 'الحقول المطلوبة: الاسم، الهاتف، الفرع' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('customers')
      .insert({
        name: body.name,
        phone: body.phone,
        notes: body.notes,
        branch_id: body.branch_id,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating customer:', error)
      return NextResponse.json(
        { error: `خطأ في إنشاء العميل: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ customer: data }, { status: 201 })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'خطأ في معالجة الطلب' },
      { status: 500 }
    )
  }
}
