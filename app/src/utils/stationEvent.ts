import { sanitizeEventImageUrl, isPlaceholderEventImage } from '../constants/houseEvent';
import type { StationEvent } from '../types';

export type EventApiRow = {
  id: number;
  title: string;
  date_label: string;
  location: string;
  is_online: boolean;
  is_this_week: boolean;
  status: 'upcoming' | 'live' | 'past';
  description?: string;
  starts_at?: string | null;
  ends_at?: string | null;
  image_url?: string | null;
  country_code?: string | null;
};

/** Map API snake_case row to listener app event shape. Skips legacy placeholder seed rows. */
export function mapEventFromApi(row: EventApiRow): StationEvent | null {
  if (isPlaceholderEventImage(row.image_url)) {
    return null;
  }
  return {
    id: row.id,
    title: row.title,
    dateLabel: row.date_label,
    location: row.location,
    isOnline: row.is_online,
    isThisWeek: row.is_this_week,
    status: row.status,
    description: row.description ?? '',
    startsAt: row.starts_at ?? null,
    endsAt: row.ends_at ?? null,
    imageUrl: sanitizeEventImageUrl(row.image_url),
    countryCode: row.country_code ?? null,
  };
}
export function normalizeStoredEvent(raw: unknown): StationEvent | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const id = typeof row.id === 'number' ? row.id : Number(row.id);
  if (!Number.isFinite(id) || id < 1) return null;

  const imageRaw = row.imageUrl ?? row.image_url;
  if (typeof imageRaw === 'string' && isPlaceholderEventImage(imageRaw)) {
    return null;
  }
  const imageUrl =
    typeof imageRaw === 'string' ? sanitizeEventImageUrl(imageRaw) : null;

  const countryRaw = row.countryCode ?? row.country_code;
  const countryCode =
    typeof countryRaw === 'string' && countryRaw.trim()
      ? countryRaw.trim().toUpperCase()
      : null;

  return {
    id,
    title: String(row.title ?? row.dateLabel ?? 'Event'),
    dateLabel: String(row.dateLabel ?? row.date_label ?? ''),
    location: String(row.location ?? ''),
    isOnline: Boolean(row.isOnline ?? row.is_online),
    isThisWeek: Boolean(row.isThisWeek ?? row.is_this_week),
    status: (row.status as StationEvent['status']) ?? 'upcoming',
    description: String(row.description ?? ''),
    startsAt: (row.startsAt ?? row.starts_at ?? null) as string | null,
    endsAt: (row.endsAt ?? row.ends_at ?? null) as string | null,
    imageUrl,
    countryCode,
  };
}

export function parseStoredEvents(raw: string): StationEvent[] {
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map(normalizeStoredEvent)
    .filter((e): e is StationEvent => e !== null);
}
