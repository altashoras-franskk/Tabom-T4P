// ── Locale context: EN / PT-BR with localStorage persistence ───────────────────

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { Locale, StringKey } from './strings';
import { t as tFn } from './strings';

const STORAGE_KEY = 't4p_locale';

function loadStoredLocale(): Locale {
  try {
    if (typeof window === 'undefined') return 'pt-BR';
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'en' || v === 'pt-BR') return v;
    return 'pt-BR';
  } catch {
    return 'pt-BR';
  }
}

function saveLocale(locale: Locale): void {
  try {
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, locale);
  } catch {}
}

interface I18nContextValue {
  locale: Locale;
  setLocale: (next: Locale) => void;
  t: (key: StringKey) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(loadStoredLocale);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    saveLocale(next);
  }, []);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      t: (key: StringKey) => tFn(locale, key),
    }),
    [locale, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}

/** Quick helper for labs: tr('pt text', 'en text') */
export function useTr(): (pt: string, en: string) => string {
  const { locale } = useI18n();
  return useCallback((pt: string, en: string) => (locale === 'en' ? en : pt), [locale]);
}
