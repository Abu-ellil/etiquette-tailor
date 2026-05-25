import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { translate, Locale } from '../i18n';

const LS_PREFIX = 'etq_';

const getSettings = (): Promise<Record<string, string>> => {
  if (window.electronAPI?.settings) {
    return window.electronAPI.settings.getAll();
  }
  const result: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(LS_PREFIX)) {
      result[key.slice(LS_PREFIX.length)] = localStorage.getItem(key)!;
    }
  }
  return Promise.resolve(result);
};

const saveSettings = (settings: Record<string, string>): Promise<void> => {
  if (window.electronAPI?.settings) {
    return window.electronAPI.settings.set(settings);
  }
  Object.entries(settings).forEach(([key, value]) => {
    localStorage.setItem(`${LS_PREFIX}${key}`, value);
  });
  window.dispatchEvent(new CustomEvent('settingsChanged', { detail: settings }));
  return Promise.resolve();
};

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
  isRTL: boolean;
  currency: string;
  setCurrency: (c: string) => void;
}

const I18nContext = createContext<I18nContextValue>({
  locale: 'en',
  setLocale: () => {},
  t: (key: string) => key,
  isRTL: false,
  currency: 'QAR',
  setCurrency: () => {},
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');
  const [currency, setCurrencyState] = useState('QAR');

  useEffect(() => {
    getSettings()
      .then((settings: Record<string, string>) => {
        const saved = settings.locale as Locale | undefined;
        if (saved === 'en' || saved === 'ar') {
          setLocaleState(saved);
          document.documentElement.dir = saved === 'ar' ? 'rtl' : 'ltr';
          document.documentElement.lang = saved;
        }
        if (settings.currency) {
          setCurrencyState(settings.currency);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as Record<string, string>;
      if (detail.locale === 'en' || detail.locale === 'ar') {
        setLocaleState(detail.locale);
        document.documentElement.dir = detail.locale === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.lang = detail.locale;
      }
      if (detail.currency) {
        setCurrencyState(detail.currency);
      }
    };
    window.addEventListener('settingsChanged', handler);
    return () => window.removeEventListener('settingsChanged', handler);
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = l;
    saveSettings({ locale: l }).catch(() => {});
  }, []);

  const setCurrency = useCallback((c: string) => {
    setCurrencyState(c);
    saveSettings({ currency: c }).catch(() => {});
  }, []);

  const t = useCallback(
    (key: string) => translate(locale, key),
    [locale]
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, isRTL: locale === 'ar', currency, setCurrency }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  return useContext(I18nContext);
}
