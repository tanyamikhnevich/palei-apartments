'use client';

import Image from 'next/image';
import Placeholder from '@/components/ui/Placeholder/Placeholder';
import { getCoverPhoto, isPhotoUrl } from '@/lib/apartmentMedia';
import { isAvifImagePath } from '@/lib/imageUpload';
import type { Apartment } from '@/types/apartment';
import styles from './ApartmentCover.module.scss';

interface ApartmentCoverProps {
  apt: Apartment;
  alt: string;
  className?: string;
  /** Shown on placeholder when there is no uploaded photo */
  placeholderLabel?: string;
  children?: React.ReactNode;
  sizes?: string;
}

export default function ApartmentCover({
  apt,
  alt,
  className = '',
  placeholderLabel,
  children,
  sizes = '(max-width: 760px) 100vw, 33vw',
}: ApartmentCoverProps) {
  const src = getCoverPhoto(apt);

  if (src && isPhotoUrl(src)) {
    return (
      <div className={`${styles.cover} ${className}`.trim()}>
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          className={styles.img}
          priority={false}
          unoptimized={isAvifImagePath(src)}
        />
        {children}
      </div>
    );
  }

  return (
    <Placeholder className={className} label={placeholderLabel}>
      {children}
    </Placeholder>
  );
}
