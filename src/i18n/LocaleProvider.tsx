import React, { createContext, useContext, useEffect, useMemo } from 'react';
import type { AppLocale } from '@/types';
import { translateLocaleMessage } from './messages';

export type { AppLocale };

interface LocaleContextValue {
  locale: AppLocale;
  isRtl: boolean;
  t: (key: string, values?: Record<string, string | number>) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

interface LocaleProviderProps {
  locale: AppLocale;
  children: React.ReactNode;
  /** Désactive la gestion globale de <html> et du titre pour une application embarquée. */
  manageDocument?: boolean;
}

export const LocaleProvider: React.FC<LocaleProviderProps> = ({ locale, children, manageDocument = true }) => {
  const isRtl = locale === 'ar';

  useEffect(() => {
    if (!manageDocument) return;

    const root = document.documentElement;
    root.lang = locale;
    root.dir = isRtl ? 'rtl' : 'ltr';
    // La police arabe est dans la stack --font-sans, gérée par Tailwind

    const appName = locale === 'ar'
      ? 'دفتر نصوصي'
      : locale === 'en'
        ? 'My lesson notebook'
        : 'Mon cahier de textes';
    document.title = appName;
    document.querySelector<HTMLMetaElement>('meta[name="application-name"]')?.setAttribute('content', appName);
  }, [isRtl, locale, manageDocument]);

  const value = useMemo<LocaleContextValue>(() => ({
    locale,
    isRtl,
    t: (key, values = {}) => translateLocaleMessage(locale, key, values),
  }), [isRtl, locale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
};

export const useLocale = (): LocaleContextValue => {
  const context = useContext(LocaleContext);
  if (!context) throw new Error('useLocale must be used within LocaleProvider');
  return context;
};
