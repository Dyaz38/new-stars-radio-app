import type { StationEvent } from '../types';
import { getEventTimeRange } from './eventCalendar';

/** Matches ad-server DEFAULT_EVENT_DURATION when ends_at is missing. */
export function isEventPast(event: StationEvent, now = new Date()): boolean {
  const range = getEventTimeRange(event);
  if (range) return range.end.getTime() < now.getTime();
  return event.status === 'past';
}

export function filterListenerEvents(events: StationEvent[], now = new Date()): StationEvent[] {
  return events.filter((e) => !isEventPast(e, now));
}

export function formatDoorsAtLabel(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}
