// تسجيل دخول بسيط بدون Supabase (للتجربة)
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'admin@etiquette.qtr'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123'

// تسجيل الدخول - يحفظ في cookie
export async function signIn(email: string, password: string) {
  if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
    return { error: 'بيانات الدخول غير صحيحة' }
  }

  // تعيين cookie
  document.cookie = 'admin_session=true; path=/; max-age=86400'

  return { data: { user: { email } }, error: null }
}

// تسجيل الخروج
export async function signOut() {
  document.cookie = 'admin_session=; path=/; max-age=0'
  return { error: null }
}
