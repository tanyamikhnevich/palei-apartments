'use client';

import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import Button from '@/components/ui/Button/Button';
import { useLanguage } from '@/i18n/LanguageProvider';

export default function ApartmentNotFound() {
  const { t } = useLanguage();

  return (
    <>
      <Header />
      <main>
        <div className="wrap" style={{ padding: '96px 28px', textAlign: 'center' }}>
          <h1 className="section-title">{t('apartments.notFound')}</h1>
          <p className="section-sub" style={{ margin: '16px auto 28px' }}>
            {t('apartments.notFoundDesc')}
          </p>
          <Button variant="primary" as="a" href="/apartments" iconRight="arrow">
            {t('apartments.backToAll')}
          </Button>
        </div>
      </main>
      <Footer />
    </>
  );
}
