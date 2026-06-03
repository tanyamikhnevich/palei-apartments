import React from 'react';
import Icon, { IconName } from '@/components/ui/Icon/Icon';
import styles from './Button.module.scss';

type Variant = 'primary' | 'navy' | 'ghost' | 'light';
type Size = 'sm' | 'md' | 'lg';

interface ButtonBaseProps {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  icon?: IconName;
  iconRight?: IconName;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

type ButtonAsButton = ButtonBaseProps &
  React.ButtonHTMLAttributes<HTMLButtonElement> & { as?: 'button' };

type ButtonAsAnchor = ButtonBaseProps &
  React.AnchorHTMLAttributes<HTMLAnchorElement> & { as: 'a'; href: string };

type ButtonProps = ButtonAsButton | ButtonAsAnchor;

export default function Button(props: ButtonProps) {
  const { variant = 'primary', size, block, icon, iconRight, children, className, style, as, ...rest } = props;

  const iconSize = size === 'sm' ? 15 : 17;

  const cls = [
    styles.btn,
    styles[variant],
    size && size !== 'md' ? styles[size] : '',
    block ? styles.block : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  const inner = (
    <>
      {icon && <Icon name={icon} size={iconSize} />}
      {children}
      {iconRight && <Icon name={iconRight} size={iconSize} />}
    </>
  );

  if (as === 'a') {
    const { href, ...anchorRest } = rest as React.AnchorHTMLAttributes<HTMLAnchorElement>;
    return (
      <a className={cls} href={href} style={style} {...anchorRest}>
        {inner}
      </a>
    );
  }

  return (
    <button className={cls} style={style} {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}>
      {inner}
    </button>
  );
}
