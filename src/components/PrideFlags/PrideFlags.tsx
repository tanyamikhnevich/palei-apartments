'use client';

import { useMemo } from 'react';
import styles from './PrideFlags.module.scss';

const STRIPES = ['#E40303', '#FF8C00', '#FFED00', '#008026', '#24408E', '#732982'];

interface FlagConfig {
  id: number;
  left: number;
  size: number;
  duration: number;
  delay: number;
  sway: number;
}

function PrideFlagSvg({ width, height }: { width: number; height: number }) {
  const stripeH = height / STRIPES.length;
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      className={styles.svg}
    >
      {STRIPES.map((fill, i) => (
        <rect key={fill} x={0} y={i * stripeH} width={width} height={stripeH + 0.5} fill={fill} />
      ))}
      <rect
        x={width * 0.08}
        y={height * 0.12}
        width={width * 0.84}
        height={height * 0.76}
        fill="none"
        stroke="rgba(255,255,255,0.35)"
        strokeWidth={0.6}
        rx={1}
      />
    </svg>
  );
}

function makeFlags(count: number): FlagConfig[] {
  return Array.from({ length: count }, (_, id) => ({
    id,
    left: Math.random() * 100,
    size: 18 + Math.random() * 14,
    duration: 8 + Math.random() * 12,
    delay: Math.random() * -20,
    sway: 20 + Math.random() * 40,
  }));
}

export default function PrideFlags({ count = 22 }: { count?: number }) {
  const flags = useMemo(() => makeFlags(count), [count]);

  return (
    <div className={styles.container} aria-hidden="true">
      {flags.map((flag) => {
        const height = flag.size * 0.65;
        return (
          <div
            key={flag.id}
            className={styles.flag}
            style={
              {
                left: `${flag.left}%`,
                '--duration': `${flag.duration}s`,
                '--delay': `${flag.delay}s`,
                '--sway': `${flag.sway}px`,
              } as React.CSSProperties
            }
          >
            <PrideFlagSvg width={flag.size} height={height} />
          </div>
        );
      })}
    </div>
  );
}
