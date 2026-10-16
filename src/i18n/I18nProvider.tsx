import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { LOCALES, messages, readLang, writeLang, type Lang, type Messages } from '.';

interface I18n {
  lang: Lang;
  locale: string;
  t: Messages;
  setLang(lang: Lang): void;
}

const I18nContext = createContext<I18n | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => readLang());

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    writeLang(next);
    setLangState(next);
  }, []);

  const value = useMemo(() => ({ lang, locale: LOCALES[lang], t: messages[lang], setLang }), [lang, setLang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n must be used inside I18nProvider');
  return value;
}
