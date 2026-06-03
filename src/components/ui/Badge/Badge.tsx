import styles from './Badge.module.scss';
import type { ApartmentStatus } from '@/types/apartment';

export type BadgeTone = 'default' | 'accent' | 'ok' | 'booked' | 'maint';

interface BadgeProps {
  tone?: BadgeTone;
  dot?: boolean;
  children: React.ReactNode;
}

export function statusTone(status: ApartmentStatus): BadgeTone {
  if (status === 'Available') return 'ok';
  if (status === 'Booked') return 'booked';
  return 'maint';
}

export default function Badge({ tone = 'default', dot, children }: BadgeProps) {
  const cls = [
    styles.badge,
    tone !== 'default' ? styles[tone] : '',
    dot ? styles.dot : '',
  ]
    .filter(Boolean)
    .join(' ');

  return <span className={cls}>{children}</span>;
}
