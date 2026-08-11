import type { Apartment, Booking } from '@/types/apartment';

export const apartments: Apartment[] = [
  {
    id: 'a1',
    area: 'Bat Yam',
    guests: 2,
    bedrooms: 1,
    beds: 1,
    bathrooms: 1,
    price: 420,
    minNights: 1,
    status: 'Available',
    tagIds: ['seaView', 'balcony'],
    rating: 0,
    reviews: 0,
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
    beds: 2,
    bathrooms: 1,
    price: 680,
    minNights: 1,
    status: 'Available',
    tagIds: ['family', 'nearBeach'],
    rating: 0,
    reviews: 0,
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
    beds: 4,
    bathrooms: 2,
    price: 1150,
    minNights: 2,
    status: 'Booked',
    tagIds: ['seaView', 'terrace', 'premium'],
    rating: 0,
    reviews: 0,
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
    id: 'a6',
    area: 'Bat Yam',
    guests: 6,
    bedrooms: 3,
    beds: 5,
    bathrooms: 2,
    price: 990,
    minNights: 1,
    status: 'Available',
    tagIds: ['family', 'equipped'],
    rating: 0,
    reviews: 0,
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

import { buildSeedBookings } from '@/db/seedBookings';

export const bookings: Booking[] = buildSeedBookings(apartments);
