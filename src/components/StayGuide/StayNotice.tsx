'use client';

import Button from '@/components/ui/Button/Button';
import Icon from '@/components/ui/Icon/Icon';
import { useLanguage } from '@/i18n/LanguageProvider';
import StayShell from './StayShell';
import styles from './StayGuide.module.scss';

type StayNoticeProps =
  | { kind: 'revoked' }
  /** The stay is over: the way in is gone, the invitation to review remains. */
  | { kind: 'ended'; apartmentId: string };

export default function StayNotice(props: StayNoticeProps) {
  const { t, href } = useLanguage();
  const ended = props.kind === 'ended';

  return (
    <StayShell>
      <section className={`${styles.card} ${styles.notice}`}>
        <span className={styles.noticeIcon}>
          <Icon name={ended ? 'heart' : 'lock'} size={26} />
        </span>
        <h1 className={styles.noticeTitle}>
          {t(ended ? 'stay.endedTitle' : 'stay.revokedTitle')}
        </h1>
        <p className={styles.muted}>{t(ended ? 'stay.endedText' : 'stay.revokedText')}</p>
        {props.kind === 'ended' && (
          <Button as="a" href={href(`/apartments/${props.apartmentId}`)} iconRight="arrow">
            {t('stay.endedCta')}
          </Button>
        )}
      </section>
    </StayShell>
  );
}
