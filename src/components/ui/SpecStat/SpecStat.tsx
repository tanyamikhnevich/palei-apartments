'use client';

import Icon, { type IconName } from '@/components/ui/Icon/Icon';
import styles from './SpecStat.module.scss';

type SpecStatProps = {
  icon: IconName;
  value: number;
  label: string;
};

export default function SpecStat({ icon, value, label }: SpecStatProps) {
  return (
    <span className={styles.stat} title={label} aria-label={`${value} ${label}`}>
      <Icon name={icon} size={16} />
      <span className={styles.value}>{value}</span>
    </span>
  );
}
