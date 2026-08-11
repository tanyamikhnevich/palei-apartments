import type { CSSProperties } from 'react';
import styles from './Skeleton.module.scss';

type SkeletonProps = {
  width?: number | string;
  height?: number | string;
  radius?: number | string;
  circle?: boolean;
  className?: string;
  style?: CSSProperties;
};

const size = (value?: number | string) =>
  typeof value === 'number' ? `${value}px` : value;

/** Neutral shimmering block used to sketch content while it loads. */
export default function Skeleton({
  width,
  height = 14,
  radius,
  circle = false,
  className = '',
  style,
}: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={`${styles.skeleton} ${circle ? styles.circle : ''} ${className}`}
      style={{
        width: size(width),
        height: size(height),
        borderRadius: circle ? undefined : size(radius),
        ...style,
      }}
    />
  );
}
