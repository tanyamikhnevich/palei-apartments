import type { Booking } from '@/types/apartment';
import { addDaysISO, formatDateRange, todayISO } from '@/lib/dates';
import type { Apartment } from '@/types/apartment';

/** Sample bookings with dates relative to today */
export function buildSeedBookings(apartmentList: Apartment[]): Booking[] {
  const today = todayISO();
  const apt = (id: string) => apartmentList.find((a) => a.id === id)?.locales.en.title ?? id;

  const items: Omit<Booking, 'dates'>[] = [
    {
      id: 'b1',
      apartmentId: 'a3',
      guest: 'Daniel & Anna',
      apt: apt('a3'),
      checkIn: addDaysISO(today, 5),
      checkOut: addDaysISO(today, 12),
      guests: 4,
      status: 'Confirmed',
      channel: 'WhatsApp',
    },
    {
      id: 'b2',
      apartmentId: 'a1',
      guest: 'Mikhail Orlov',
      apt: apt('a1'),
      checkIn: addDaysISO(today, 8),
      checkOut: addDaysISO(today, 11),
      guests: 2,
      status: 'New request',
      channel: 'Website',
    },
    {
      id: 'b3',
      apartmentId: 'a2',
      guest: 'The Levy Family',
      apt: apt('a2'),
      checkIn: addDaysISO(today, 14),
      checkOut: addDaysISO(today, 21),
      guests: 6,
      status: 'New request',
      channel: 'WhatsApp',
    },
    {
      id: 'b4',
      apartmentId: 'a5',
      guest: 'Sophie Bernard',
      apt: apt('a5'),
      checkIn: addDaysISO(today, 17),
      checkOut: addDaysISO(today, 20),
      guests: 2,
      status: 'Confirmed',
      channel: 'Booking',
    },
    {
      id: 'b5',
      apartmentId: 'a4',
      guest: 'Yulia Smirnova',
      apt: apt('a4'),
      checkIn: addDaysISO(today, 23),
      checkOut: addDaysISO(today, 30),
      guests: 4,
      status: 'New request',
      channel: 'Website',
    },
  ];

  return items.map((b) => ({
    ...b,
    dates: formatDateRange(b.checkIn, b.checkOut, 'en'),
  }));
}
