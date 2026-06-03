import type { Apartment, Booking } from '@/types/apartment';
import type { FilterId } from '@/i18n/types';
import { FILTER_IDS } from '@/i18n/types';

export const apartments: Apartment[] = [
  {
    id: 'a1',
    area: 'Bat Yam',
    guests: 2,
    bedrooms: 1,
    bathrooms: 1,
    price: 420,
    status: 'Available',
    tagIds: ['seaView', 'balcony'],
    rating: 4.9,
    reviews: 64,
    locales: {
      en: {
        title: 'Sea Breeze Studio',
        location: 'Ben Gurion Blvd, Bat Yam',
        description:
          'Sun-filled studio one block from the promenade, with a private balcony facing the morning sea.',
        photoLabel: 'studio · balcony · sea',
      },
      ru: {
        title: 'Sea Breeze Studio',
        location: 'бул. Бен-Гурион, Бат-Ям',
        description:
          'Светлая студия в квартале от набережной, с балконом на утреннее море.',
        photoLabel: 'студия · балкон · море',
      },
      he: {
        title: 'Sea Breeze Studio',
        location: 'שדרות בן גוריון, בת ים',
        description: 'סטודיו מואר במרחק בלוק מהטיילת, עם מרפסת לים של הבוקר.',
        photoLabel: 'סטודיו · מרפסת · ים',
      },
    },
  },
  {
    id: 'a2',
    area: 'Bat Yam',
    guests: 4,
    bedrooms: 2,
    bathrooms: 1,
    price: 680,
    status: 'Available',
    tagIds: ['family', 'nearBeach'],
    rating: 4.8,
    reviews: 41,
    locales: {
      en: {
        title: 'Marina Two-Bedroom',
        location: 'Marina District, Bat Yam',
        description:
          'Bright family apartment steps from the marina, sandy beach, cafés and the weekend market.',
        photoLabel: 'living room · 2 bedrooms',
      },
      ru: {
        title: 'Marina Two-Bedroom',
        location: 'район Марины, Бат-Ям',
        description:
          'Светлая семейная квартира у марины, пляжа, кафе и рынка по выходным.',
        photoLabel: 'гостиная · 2 спальни',
      },
      he: {
        title: 'Marina Two-Bedroom',
        location: 'אזור המרינה, בת ים',
        description: 'דירת משפחה מוארת ליד המרינה, החוף, בתי קפה ושוק סוף השבוע.',
        photoLabel: 'סלון · 2 חדרי שינה',
      },
    },
  },
  {
    id: 'a3',
    area: 'Bat Yam',
    guests: 5,
    bedrooms: 3,
    bathrooms: 2,
    price: 1150,
    status: 'Booked',
    tagIds: ['seaView', 'terrace', 'premium'],
    rating: 5.0,
    reviews: 28,
    locales: {
      en: {
        title: 'Promenade Penthouse',
        location: 'Tayelet Boardwalk, Bat Yam',
        description:
          'Top-floor penthouse with a wraparound terrace and panoramic Mediterranean views at sunset.',
        photoLabel: 'penthouse · terrace · sunset',
      },
      ru: {
        title: 'Promenade Penthouse',
        location: 'набережная Тайелет, Бат-Ям',
        description: 'Пентхаус на верхнем этаже с террасой и панорамой Средиземного моря на закате.',
        photoLabel: 'пентхаус · терраса · закат',
      },
      he: {
        title: 'Promenade Penthouse',
        location: 'טיילת תיילת, בת ים',
        description: 'נטהאוז בקומה עליונה עם טרסה ונוף פנורמי לים התיכון בשקיעה.',
        photoLabel: 'נטהאוז · טרסה · שקיעה',
      },
    },
  },
  {
    id: 'a4',
    area: 'Tel Aviv',
    guests: 3,
    bedrooms: 1,
    bathrooms: 1,
    price: 890,
    status: 'Available',
    tagIds: ['garden', 'central'],
    rating: 4.7,
    reviews: 52,
    locales: {
      en: {
        title: 'Old North Garden Flat',
        location: 'Old North, Tel Aviv',
        description:
          "Quiet garden apartment near Dizengoff, a short ride from the city's best restaurants and galleries.",
        photoLabel: 'garden flat · Tel Aviv',
      },
      ru: {
        title: 'Old North Garden Flat',
        location: 'Старый Север, Тель-Авив',
        description:
          'Тихая квартира с садом у Дизенгоф — недалеко от лучших ресторанов и галерей города.',
        photoLabel: 'квартира с садом · Тель-Авив',
      },
      he: {
        title: 'Old North Garden Flat',
        location: 'הצפון הישן, תל אביב',
        description: 'דירת גן שקטה ליד דיזנגוף — נסיעה קצרה למסעדות וגלריות הטובות בעיר.',
        photoLabel: 'דירת גן · תל אביב',
      },
    },
  },
  {
    id: 'a5',
    area: 'Tel Aviv',
    guests: 2,
    bedrooms: 1,
    bathrooms: 1,
    price: 970,
    status: 'Maintenance',
    tagIds: ['design', 'nightlife'],
    rating: 4.9,
    reviews: 37,
    locales: {
      en: {
        title: 'Rothschild City Loft',
        location: 'Rothschild Blvd, Tel Aviv',
        description:
          'Design loft on the boulevard, surrounded by Bauhaus architecture, coffee and nightlife.',
        photoLabel: 'loft · Bauhaus · boulevard',
      },
      ru: {
        title: 'Rothschild City Loft',
        location: 'бульвар Ротшильд, Тель-Авив',
        description:
          'Дизайнерский лофт на бульваре — баухаус, кофе и ночная жизнь вокруг.',
        photoLabel: 'лофт · баухаус · бульвар',
      },
      he: {
        title: 'Rothschild City Loft',
        location: 'שדרות רוטשילד, תל אביב',
        description: 'לופט עיצובי על השדרה — באוהאוס, קפה וחיי לילה מסביב.',
        photoLabel: 'לופט · באוהאוס · שדרה',
      },
    },
  },
  {
    id: 'a6',
    area: 'Bat Yam',
    guests: 6,
    bedrooms: 3,
    bathrooms: 2,
    price: 990,
    status: 'Available',
    tagIds: ['family', 'equipped'],
    rating: 4.8,
    reviews: 19,
    locales: {
      en: {
        title: 'Bat Yam Family Suite',
        location: 'Balfour St, Bat Yam',
        description:
          'Spacious suite for larger families, with a fully equipped kitchen, laundry and two balconies.',
        photoLabel: 'family suite · kitchen',
      },
      ru: {
        title: 'Bat Yam Family Suite',
        location: 'ул. Бальфур, Бат-Ям',
        description:
          'Просторный сьют для больших семей: кухня, стиральная и два балкона.',
        photoLabel: 'семейный сьют · кухня',
      },
      he: {
        title: 'Bat Yam Family Suite',
        location: 'רחוב בלפור, בת ים',
        description: 'סוויטה מרווחת למשפחות גדולות — מטבח מצויד, כביסה ושתי מרפסות.',
        photoLabel: 'סוויטה משפחתית · מטבח',
      },
    },
  },
];

export function filterApartments(list: Apartment[], filter: FilterId): Apartment[] {
  if (filter === 'all') return list;
  if (filter === 'batYam') return list.filter((a) => a.area === 'Bat Yam');
  if (filter === 'telAviv') return list.filter((a) => a.area === 'Tel Aviv');
  if (filter === 'seaView') return list.filter((a) => a.tagIds.includes('seaView'));
  if (filter === 'family') return list.filter((a) => a.tagIds.includes('family'));
  return list;
}

export { FILTER_IDS };
export type { FilterId };

import { buildSeedBookings } from '@/db/seedBookings';

export const bookings: Booking[] = buildSeedBookings(apartments);
