'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from '@/lib/auth'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await signIn(email, password)

    if (error) {
      setError('بيانات الدخول غير صحيحة')
      setLoading(false)
    } else {
      window.location.href = '/dashboard'
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-secondary p-4">
      <div className="max-w-md w-full">
        <div className="bg-bg-card rounded-lg shadow-md p-6 md:p-8 border border-border-primary">
          <h1 className="text-2xl font-bold text-center mb-6 text-text-primary">Etiquette Analytics</h1>
          <h2 className="text-lg text-text-secondary text-center mb-6">سجل الدخول لعرض بيانات الفروع</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-text-secondary mb-1">
                البريد الإلكتروني
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 min-h-[44px] border border-border-primary rounded-md bg-bg-input text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-text-secondary mb-1">
                كلمة المرور
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 min-h-[44px] border border-border-primary rounded-md bg-bg-input text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
                required
              />
            </div>

            {error && (
              <div className="bg-accent-danger-light text-accent-danger px-4 py-2 rounded-md text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[44px] bg-accent-primary text-white py-2 px-4 rounded-md hover:bg-accent-primary-hover focus:outline-none focus:ring-2 focus:ring-accent-primary disabled:opacity-50 font-semibold"
            >
              {loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
