'use client';

import { useEffect } from 'react';
import { useLanguage } from './LanguageProvider';

export default function LocaleDocument() {
  const { locale, t } = useLanguage();

  useEffect(() => {
    const html = document.documentElement;
    html.lang = locale;
    html.dir = locale === 'he' ? 'rtl' : 'ltr';
    document.title = t('meta.title');
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', t('meta.description'));
  }, [locale, t]);

  return null;
}
