'use client';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { translations, type Language } from './translations';

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function interpolate(str: string, vars?: Record<string, string | number>): string {
  if (!vars) return str;
  return str.replace(/\{\{(\w+)\}\}/g, (_, name) => (name in vars ? String(vars[name]) : `{{${name}}}`));
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    // Enforce English language across all sessions
    localStorage.setItem('language', 'en');
    setLanguageState('en');
  }, []);

  const setLanguage = useCallback((_lang: Language) => {
    setLanguageState('en');
    localStorage.setItem('language', 'en');
  }, []);

  const t = useCallback((key: string, vars?: Record<string, string | number>) => {
    const dict = translations.en;
    const str = dict[key] ?? key;
    return interpolate(str, vars);
  }, []);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return ctx;
}
