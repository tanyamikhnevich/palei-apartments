'use client';

import { useMemo } from 'react';
import { Circle, MapContainer, TileLayer } from 'react-leaflet';
import type { Apartment } from '@/types/apartment';
import Icon from '@/components/ui/Icon/Icon';
import { useLanguage } from '@/i18n/LanguageProvider';
import { getApartmentCopy } from '@/i18n/apartmentLocale';
import { coordsForApartment } from '@/data/apartmentGeo';
import { APPROX_RADIUS_M } from '@/lib/geoPrivacy';
import 'leaflet/dist/leaflet.css';
import styles from './ApartmentMiniMap.module.scss';

type ApartmentMiniMapProps = {
  apt: Apartment;
};

/**
 * Roughly where this apartment is — a small, calm map next to the description.
 * An area rather than a pin: the exact building is not published, so drawing a
 * point on one would be a lie as well as a leak. Interaction is deliberately
 * limited (no scroll zoom, no drag) so it never traps a finger scrolling the
 * page on a phone.
 */
export default function ApartmentMiniMap({ apt }: ApartmentMiniMapProps) {
  const { locale, t } = useLanguage();
  const copy = getApartmentCopy(apt, locale);
  const point = useMemo(() => coordsForApartment(apt), [apt]);

  if (!point) return null;

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${point.lat},${point.lng}`;

  return (
    <section className={styles.wrap}>
      <MapContainer
        className={styles.map}
        center={[point.lat, point.lng]}
        zoom={16}
        scrollWheelZoom={false}
        dragging={false}
        doubleClickZoom={false}
        zoomControl={false}
        keyboard={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          maxZoom={19}
        />
        <Circle
          center={[point.lat, point.lng]}
          radius={APPROX_RADIUS_M}
          pathOptions={{ color: '#1b6ca8', weight: 1, opacity: 0.5, fillOpacity: 0.12 }}
          interactive={false}
        />
      </MapContainer>

      <div className={styles.bar}>
        <span className={styles.address}>
          <Icon name="pin" size={16} />
          {copy.location}
        </span>
        <a className={styles.link} href={mapsUrl} target="_blank" rel="noopener noreferrer">
          {t('location.openMaps')}
          <Icon name="arrow" size={15} />
        </a>
      </div>
      <p className={styles.approx}>{t('apartments.mapApprox')}</p>
    </section>
  );
}
