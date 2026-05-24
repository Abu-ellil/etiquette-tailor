// API لجلب بيانات التحليلات من Supabase فقط
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  // التحقق من أن Supabase مهيأ بشكل صحيح
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

  if (!supabaseUrl || supabaseUrl.includes('placeholder') || !supabaseKey || supabaseKey.includes('placeholder')) {
    return NextResponse.json(
      { error: 'Supabase not configured. Please add your credentials in .env.local' },
      { status: 500 }
    )
  }

  // جلب البيانات الحقيقية من Supabase - استخدام الأعمدة الصحيحة
  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, branch_id, price, paid, created_at, status, created_by')

  if (error) {
    console.error('Supabase error:', error)

    // خطأ أكثر تفصيلاً
    if (error.code === '42P01') {
      return NextResponse.json({
        error: 'الجداول غير موجودة في قاعدة البيانات',
        details: 'الرجاء تشغيل الملف supabase-setup.sql في محرر SQL الخاص بـ Supabase'
      }, { status: 500 })
    }

    return NextResponse.json({
      error: `خطأ في Supabase: ${error.message}`,
      code: error.code,
      hint: error.hint
    }, { status: 500 })
  }

  // الفروع في قاعدة البيانات هي أرقام: 1 للميرة، 2 للشارع التجاري
  const branchAOrders = orders?.filter(o => o.branch_id === 1) || []
  const branchBOrders = orders?.filter(o => o.branch_id === 2) || []

  const calcMetrics = (orderList: any[]) => {
    const totalRevenue = orderList.reduce((sum, o) => sum + (o.price || 0), 0)
    const totalPaid = orderList.reduce((sum, o) => sum + (o.paid || 0), 0)
    const totalBalance = orderList.reduce((sum, o) => sum + ((o.price || 0) - (o.paid || 0)), 0)
    // الحالة في قاعدة البيانات هي 'delivered' وليس 'Delivered'
    const completedOrders = orderList.filter(o => o.status === 'delivered').length
    const pendingOrders = orderList.filter(o => o.status !== 'delivered').length
    const avgOrderValue = orderList.length > 0 ? totalRevenue / orderList.length : 0

    return {
      totalRevenue,
      totalPaid,
      totalBalance,
      completedOrders,
      pendingOrders,
      avgOrderValue,
      orderCount: orderList.length,
    }
  }

  const getDailyRevenue = (orderList: any[]) => {
    const daily: Record<string, number> = {}
    orderList.forEach(o => {
      const date = new Date(o.created_at).toISOString().split('T')[0]
      daily[date] = (daily[date] || 0) + (o.price || 0)
    })
    return Object.entries(daily).map(([date, revenue]) => ({ date, revenue }))
  }

  return NextResponse.json({
    branches: {
      A: {
        name: 'الميرة — أم قرن',
        ...calcMetrics(branchAOrders),
        dailyRevenue: getDailyRevenue(branchAOrders),
      },
      B: {
        name: 'الشارع التجاري — أم قرن',
        ...calcMetrics(branchBOrders),
        dailyRevenue: getDailyRevenue(branchBOrders),
      },
    },
    comparison: {
      revenueDifference: calcMetrics(branchAOrders).totalRevenue - calcMetrics(branchBOrders).totalRevenue,
      ordersDifference: branchAOrders.length - branchBOrders.length,
      moreProfitable: calcMetrics(branchAOrders).totalRevenue > calcMetrics(branchBOrders).totalRevenue ? ('A' as const) : ('B' as const),
    },
    summary: {
      totalRevenue: calcMetrics(orders || []).totalRevenue,
      totalOrders: orders?.length || 0,
      totalBalance: calcMetrics(orders || []).totalBalance,
    },
  })
}
