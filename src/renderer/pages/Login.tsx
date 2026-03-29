import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { Session } from '../App';
import TitleBar from '../components/TitleBar';

interface LoginFormValues {
  username: string;
  password: string;
}

interface LoginProps {
  onLogin: (session: Session) => void;
}

export default function LoginPage({ onLogin }: LoginProps) {
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<LoginFormValues>();

  const onSubmit = async (data: LoginFormValues) => {
    try {
      setError('');
      const session = await window.electronAPI.auth.login({
        username: data.username,
        password: data.password,
      });
      if (session) {
        onLogin(session);
      } else {
        setError('Invalid username or password');
      }
    } catch {
      setError('Login failed. Please try again.');
    }
  };

  return (
    <div className="flex flex-col h-screen"
      style={{
        backgroundColor: '#f8f9fa',
      }}
    >
      <TitleBar />
      <div className="flex-1 flex items-center justify-center p-6"
        style={{
          backgroundImage: 'radial-gradient(#d1c2d2 0.5px, transparent 0.5px)',
          backgroundSize: '24px 24px',
        }}
      >
      <main className="w-full max-w-md">
        {/* Brand Identity Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white shadow-[0px_20px_40px_rgba(25,28,29,0.06)] mb-6">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: '2.5rem' }}>
              straighten
            </span>
          </div>
          <h1 className="font-headline text-3xl font-extrabold tracking-tight text-on-surface mb-2">
            Etiquette Tailor
          </h1>
          <p className="text-secondary text-sm tracking-wide">
            Bespoke Studio
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-surface-container-lowest rounded-xl p-10 shadow-[0px_20px_40px_rgba(25,28,29,0.06)] border border-outline-variant/10">
          {error && (
            <div className="mb-6 p-3 bg-error-container text-on-error-container rounded-lg text-sm font-medium text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Username Field */}
            <div className="relative group">
              <label
                className="block text-xs font-semibold uppercase tracking-[0.05em] text-secondary mb-2 px-1"
                htmlFor="username"
              >
                Username
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-4 text-outline">
                  person
                </span>
                <input
                  {...register('username', { required: 'Username is required' })}
                  id="username"
                  type="text"
                  className="input-field pl-12"
                  placeholder="Workshop ID or Email"
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="relative group">
              <div className="flex justify-between items-center mb-2 px-1">
                <label
                  className="block text-xs font-semibold uppercase tracking-[0.05em] text-secondary"
                  htmlFor="password"
                >
                  Password
                </label>
              </div>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-4 text-outline">
                  lock
                </span>
                <input
                  {...register('password', { required: 'Password is required' })}
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="input-field pl-12 pr-12"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="absolute right-4 text-outline hover:text-primary transition-colors"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                >
                  <span className="material-symbols-outlined">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {/* Login Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full h-14 rounded-lg font-headline font-bold text-lg flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {isSubmitting ? 'Signing in...' : 'Sign In'}
                {!isSubmitting && (
                  <span className="material-symbols-outlined">arrow_forward</span>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <footer className="mt-12 text-center">
          <div className="flex items-center justify-center gap-6 mb-4">
            <span className="h-px w-8 bg-outline-variant/40" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-outline/60">
              Bespoke Security Standards
            </p>
            <span className="h-px w-8 bg-outline-variant/40" />
          </div>
          <p className="text-[11px] text-secondary/60 font-medium">
            &copy; 2026 Etiquette Tailor System. All rights reserved.
          </p>
        </footer>
      </main>

      {/* Visual Accent Element */}
      <div className="fixed bottom-0 right-0 p-12 opacity-5 pointer-events-none hidden lg:block">
        <span className="material-symbols-outlined text-primary" style={{ fontSize: '20rem' }}>
          straighten
        </span>
      </div>
      </div>
    </div>
  );
}
