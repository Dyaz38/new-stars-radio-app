import type { StationEvent } from '../types';

/** Same rules as ad-server event_geo.filter_events_for_country */
export function eventVisibleForCountry(
  event: StationEvent,
  country: string | null | undefined,
): boolean {
  const code = event.countryCode?.trim().toUpperCase();
  if (!code) return true;
  if (!country?.trim()) return false;
  return code === country.trim().toUpperCase();
}

export function filterEventsForCountry(
  events: StationEvent[],
  country: string | null | undefined,
): StationEvent[] {
  return events.filter((e) => eventVisibleForCountry(e, country));
}
