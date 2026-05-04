import type { StationEvent } from '../types';
import { RADIO_CONFIG } from '../constants';

const DEFAULT_DURATION_MS = 2 * 60 * 60 * 1000;

export function getEventTimeRange(event: StationEvent): { start: Date; end: Date } | null {
  if (!event.startsAt) return null;
  const start = new Date(event.startsAt);
  if (Number.isNaN(start.getTime())) return null;

  if (event.endsAt) {
    const end = new Date(event.endsAt);
    if (Number.isNaN(end.getTime()) || end <= start) {
      return { start, end: new Date(start.getTime() + DEFAULT_DURATION_MS) };
    }
    return { start, end };
  }

  return { start, end: new Date(start.getTime() + DEFAULT_DURATION_MS) };
}

/** Google Calendar `dates` param: UTC, no colons. */
function toGoogleUtc(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function icsEscapeText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

export function buildGoogleCalendarUrl(
  event: StationEvent,
  start: Date,
  end: Date,
): string {
  const text = encodeURIComponent(event.title);
  const details = encodeURIComponent(
    [
      event.description,
      `When: ${event.dateLabel}`,
      RADIO_CONFIG.STATION_NAME,
    ]
      .filter(Boolean)
      .join('\n\n'),
  );
  const loc = encodeURIComponent(event.location);
  const dates = `${toGoogleUtc(start)}/${toGoogleUtc(end)}`;
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${dates}&details=${details}&location=${loc}`;
}

export function buildIcsContent(event: StationEvent, start: Date, end: Date): string {
  const domain = 'newstarsradio';
  const uid = `event-${event.id}-${start.getTime()}@${domain}`;
  const dtStamp = toGoogleUtc(new Date());
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//New Stars Radio//Listener//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${toGoogleUtc(start)}`,
    `DTEND:${toGoogleUtc(end)}`,
    `SUMMARY:${icsEscapeText(event.title)}`,
    `DESCRIPTION:${icsEscapeText([event.description, `When: ${event.dateLabel}`].filter(Boolean).join('\\n'))}`,
    `LOCATION:${icsEscapeText(event.location)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.join('\r\n');
}

export function downloadIcsFile(filename: string, body: string): void {
  const blob = new Blob([body], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  a.click();
  URL.revokeObjectURL(url);
}
