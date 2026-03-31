import en from './en';
import ar from './ar';

export type Locale = 'en' | 'ar';

const translations: Record<Locale, Record<string, string>> = { en, ar };

export function translate(locale: Locale, key: string): string {
  return translations[locale]?.[key] ?? translations.en[key] ?? key;
}
