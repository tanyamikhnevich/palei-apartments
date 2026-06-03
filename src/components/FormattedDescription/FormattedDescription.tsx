import { formatDescriptionText } from '@/lib/formatDescription';
import styles from './FormattedDescription.module.scss';

type FormattedDescriptionProps = {
  text: string;
  className?: string;
  clamp?: boolean;
};

export default function FormattedDescription({
  text,
  className = '',
  clamp = false,
}: FormattedDescriptionProps) {
  const formatted = formatDescriptionText(text);
  if (!formatted) return null;

  return (
    <p className={`${styles.text} ${clamp ? styles.clamp : ''} ${className}`.trim()}>{formatted}</p>
  );
}
