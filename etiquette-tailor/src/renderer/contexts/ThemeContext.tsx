import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

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

type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  setTheme: () => {},
  isDark: false,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light');

  useEffect(() => {
    getSettings()
      .then((settings: Record<string, string>) => {
        const saved = settings.theme as Theme | undefined;
        if (saved === 'dark' || saved === 'light') {
          setThemeState(saved);
          document.documentElement.classList.toggle('dark', saved === 'dark');
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as Record<string, string>;
      if (detail.theme === 'dark' || detail.theme === 'light') {
        setThemeState(detail.theme);
        document.documentElement.classList.toggle('dark', detail.theme === 'dark');
      }
    };
    window.addEventListener('settingsChanged', handler);
    return () => window.removeEventListener('settingsChanged', handler);
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    document.documentElement.classList.toggle('dark', t === 'dark');
    saveSettings({ theme: t }).catch(() => {});
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark: theme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
