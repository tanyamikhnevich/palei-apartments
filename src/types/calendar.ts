export type CalendarFeedSource = 'airbnb' | 'booking' | 'vrbo' | 'other';

export const CALENDAR_FEED_SOURCES: CalendarFeedSource[] = ['airbnb', 'booking', 'vrbo', 'other'];

export const CALENDAR_SOURCE_LABELS: Record<CalendarFeedSource, string> = {
  airbnb: 'Airbnb',
  booking: 'Booking.com',
  vrbo: 'Vrbo',
  other: 'Other',
};

export type CalendarSyncStatus = 'ok' | 'error';

/** An external iCal calendar we import blocked dates from. */
export interface CalendarFeed {
  id: string;
  apartmentId: string;
  source: CalendarFeedSource;
  label: string;
  url: string;
  lastSyncAt: string | null;
  lastStatus: CalendarSyncStatus | null;
  lastError: string | null;
  /** Blocked ranges stored from the last successful sync. */
  eventCount: number;
}

export type CalendarFeedInput = {
  apartmentId: string;
  source: CalendarFeedSource;
  label?: string;
  url: string;
};

export type CalendarSyncOutcome = {
  feedId: string;
  apartmentId: string;
  ok: boolean;
  eventCount: number;
  error?: string;
};
