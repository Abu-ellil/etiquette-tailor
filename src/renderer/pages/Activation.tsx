import React, { useState } from 'react';
import { useTranslation } from '../contexts/I18nContext';
import TitleBar from '../components/TitleBar';

interface ActivationProps {
  onActivated: () => void;
}

export default function ActivationPage({ onActivated }: ActivationProps) {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const valid = await window.electronAPI.activation.activate(code.trim());
      if (valid) {
        onActivated();
      } else {
        setError(t('Invalid activation code'));
      }
    } catch {
      setError(t('Activation failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-surface">
      <TitleBar />
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm animate-fadeIn">
          {/* Logo / Brand */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #763952 0%, #92506a 100%)' }}>
              <span className="material-symbols-outlined text-white text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>scissors</span>
            </div>
            <h1 className="font-headline text-2xl font-bold text-on-surface">{t('Etiquette Tailor')}</h1>
            <p className="text-secondary text-sm mt-1">{t('Activation Required')}</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-secondary mb-1 ml-1">
                {t('Activation Code')}
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => { setCode(e.target.value); setError(''); }}
                className="input-field text-center text-lg font-mono tracking-widest"
                placeholder="XXXX-XXXX"
                autoFocus
              />
            </div>

            {error && (
              <div className="bg-error-container text-on-error-container rounded-xl p-3 flex items-center gap-2 text-sm font-medium">
                <span className="material-symbols-outlined text-base">error</span>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !code.trim()}
              className="w-full h-14 text-white rounded-xl font-headline font-bold text-base shadow-lg flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-60 disabled:pointer-events-none"
              style={{ background: 'linear-gradient(135deg, #763952 0%, #92506a 100%)' }}
            >
              {loading ? (
                <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg">verified_user</span>
                  {t('Activate')}
                </>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-outline mt-6">
            {t('Contact support to get your activation code.')}
          </p>
        </div>
      </div>
    </div>
  );
}
