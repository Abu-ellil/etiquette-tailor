// API لإدارة المصروفات
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export interface ExpenseInput {
  category: 'rent' | 'utilities' | 'materials' | 'fabric' | 'supplies' | 'salaries' | 'other'
  description: string
  amount: number
  expense_date: string
  branch_id: number
  note?: string
}

const CATEGORY_LABELS: Record<string, string> = {
  rent: 'إيجار',
  utilities: 'مرافق',
  materials: 'مواد',
  fabric: 'أقمشة',
  supplies: 'مستلزمات',
  salaries: 'رواتب',
  other: 'أخرى',
}

// GET /api/expenses - جلب قائمة المصروفات
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const branchId = searchParams.get('branch_id')
  const category = searchParams.get('category')
  const startDate = searchParams.get('start_date')
  const endDate = searchParams.get('end_date')

  let query = supabase
    .from('expenses')
    .select('*')
    .eq('is_deleted', 0)
    .order('expense_date', { ascending: false })

  if (branchId) {
    query = query.eq('branch_id', parseInt(branchId))
  }
  if (category) {
    query = query.eq('category', category)
  }
  if (startDate) {
    query = query.gte('expense_date', startDate)
  }
  if (endDate) {
    query = query.lte('expense_date', endDate)
  }

  const { data, error } = await query

  if (error) {
    console.error('Supabase error:', error)
    return NextResponse.json(
      { error: `خطأ في جلب المصروفات: ${error.message}` },
      { status: 500 }
    )
  }

  // إضافة الأسماء العربية للفئات
  const expenses = data?.map(expense => ({
    ...expense,
    category_name: CATEGORY_LABELS[expense.category] || expense.category,
  })) || []

  return NextResponse.json({ expenses })
}

// POST /api/expenses - إنشاء مصروف جديد
export async function POST(request: NextRequest) {
  try {
    const body: ExpenseInput = await request.json()

    if (!body.category || !body.description || !body.amount || !body.expense_date || !body.branch_id) {
      return NextResponse.json(
        { error: 'جميع الحقول مطلوبة' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('expenses')
      .insert({
        category: body.category,
        description: body.description,
        amount: body.amount,
        expense_date: body.expense_date,
        branch_id: body.branch_id,
        note: body.note,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating expense:', error)
      return NextResponse.json(
        { error: `خطأ في إنشاء المصروف: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ expense: { ...data, category_name: CATEGORY_LABELS[data.category] } }, { status: 201 })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'خطأ في معالجة الطلب' },
      { status: 500 }
    )
  }
}
