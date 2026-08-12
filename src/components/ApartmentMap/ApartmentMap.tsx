'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import type { Apartment } from '@/types/apartment';
import { useLanguage } from '@/i18n/LanguageProvider';
import { getApartmentCopy } from '@/i18n/apartmentLocale';
import { BAT_YAM_CENTER, groupApartmentsForMap } from '@/data/apartmentGeo';
import 'leaflet/dist/leaflet.css';
import styles from './ApartmentMap.module.scss';

type ApartmentMapProps = {
  apartments: Apartment[];
};

/**
 * Leaflet's default marker loads its icon from a relative image path, which
 * bundlers break. A div icon avoids that entirely and lets one pin show how
 * many apartments share the building.
 */
function buildPin(count: number): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<span class="${styles.pin}">${count}</span>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -18],
  });
}

export default function ApartmentMap({ apartments }: ApartmentMapProps) {
  const { locale, t } = useLanguage();

  const { groups, unplaced } = useMemo(
    () => groupApartmentsForMap(apartments, locale),
    [apartments, locale]
  );

  // Remounting on a different set is cheaper than fighting Leaflet's imperative
  // view state, and the map is only ever opened on demand.
  const mapKey = groups.map((g) => `${g.key}:${g.apartments.length}`).join('|');

  const bounds = useMemo(() => {
    if (groups.length < 2) return undefined;
    return L.latLngBounds(groups.map((g) => [g.point.lat, g.point.lng] as [number, number])).pad(
      0.2
    );
  }, [groups]);

  const single = groups.length === 1 ? groups[0].point : undefined;

  return (
    <div className={styles.wrap}>
      <MapContainer
        key={mapKey}
        className={styles.map}
        center={[single?.lat ?? BAT_YAM_CENTER.lat, single?.lng ?? BAT_YAM_CENTER.lng]}
        zoom={single ? 16 : 14}
        bounds={bounds}
        scrollWheelZoom={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          maxZoom={19}
        />

        {groups.map((group) => (
          <Marker
            key={group.key}
            position={[group.point.lat, group.point.lng]}
            icon={buildPin(group.apartments.length)}
          >
            <Popup>
              <div className={styles.popupTitle}>{group.address}</div>
              <ul className={styles.popupList}>
                {group.apartments.map((apt) => (
                  <li key={apt.id} className={styles.popupItem}>
                    <Link href={`/apartments/${apt.id}`} className={styles.popupLink}>
                      {getApartmentCopy(apt, locale).title}
                    </Link>
                    <span className={styles.popupPrice}>
                      ₪{apt.price} {t('apartments.perNight')}
                    </span>
                  </li>
                ))}
              </ul>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {unplaced > 0 && (
        <p className={styles.note}>
          {t('apartments.mapUnplaced').replace('{count}', String(unplaced))}
        </p>
      )}
    </div>
  );
}
