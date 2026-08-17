'use client';

import { useMemo } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, TileLayer } from 'react-leaflet';
import type { Apartment } from '@/types/apartment';
import Icon from '@/components/ui/Icon/Icon';
import { useLanguage } from '@/i18n/LanguageProvider';
import { getApartmentCopy } from '@/i18n/apartmentLocale';
import { coordsForApartment } from '@/data/apartmentGeo';
import 'leaflet/dist/leaflet.css';
import styles from './ApartmentMiniMap.module.scss';

type ApartmentMiniMapProps = {
  apt: Apartment;
};

/** Same div-icon trick as the full map: Leaflet's bundled marker image 404s. */
const PIN = L.divIcon({
  className: '',
  html: `<span class="${styles.pin}"></span>`,
  iconSize: [26, 26],
  iconAnchor: [13, 13],
});

/**
 * Where this one apartment actually is — a small, calm map next to the
 * description. Interaction is deliberately limited (no scroll zoom, no drag)
 * so it never traps a finger scrolling the page on a phone; "open in maps"
 * hands the guest over to their own app for anything more.
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
        <Marker position={[point.lat, point.lng]} icon={PIN} />
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
    </section>
  );
}
