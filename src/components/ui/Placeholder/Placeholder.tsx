import React from 'react';
import styles from './Placeholder.module.scss';

interface PlaceholderProps {
  label?: string;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

export default function Placeholder({ label, className = '', style, children }: PlaceholderProps) {
  return (
    <div className={`${styles.ph} ${className}`} style={style}>
      {label ? <span className={styles.tag}>{label}</span> : null}
      {children}
    </div>
  );
}
