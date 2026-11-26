import type { ScheduleDayKey } from '../types';

/** Admin schedule clock labels are authored in Namibia time. */
export const SCHEDULE_SOURCE_TIMEZONE = 'Africa/Windhoek';

/** CAT is UTC+2 year-round (no daylight saving). */
const WINDHOEK_OFFSET_MS = 2 * 60 * 60 * 1000;

type WallParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: number; // 0 Sun … 6 Sat
};

/** Parse a clock label like "10:00 AM" into minutes from midnight. */
export function parseScheduleClockTime(timeStr: string): number {
  const [time, period] = timeStr.trim().split(/\s+/);
  const [hours, minutes] = time.split(':').map(Number);
  let totalMinutes = hours * 60 + minutes;

  if (period === 'PM' && hours !== 12) totalMinutes += 12 * 60;
  if (period === 'AM' && hours === 12) totalMinutes = minutes;

  return totalMinutes;
}

export function getScheduleStartTimeLabel(timeRange: string): string {
  return timeRange.split(' - ')[0].trim();
}

function getViewerTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/** Calendar / clock parts for an instant in Africa/Windhoek. */
export function getWindhoekParts(date: Date): WallParts {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: SCHEDULE_SOURCE_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    weekday: 'short',
  });
  const map: Record<string, string> = {};
  for (const part of fmt.formatToParts(date)) {
    if (part.type !== 'literal') map[part.type] = part.value;
  }
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    weekday: weekdayMap[map.weekday] ?? 0,
  };
}

/** UTC instant for a Windhoek wall-clock on a given Y-M-D. */
export function windhoekWallTimeToUtc(
  year: number,
  month: number,
  day: number,
  minutesFromMidnight: number,
): Date {
  const hour = Math.floor(minutesFromMidnight / 60);
  const minute = minutesFromMidnight % 60;
  return new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0) - WINDHOEK_OFFSET_MS);
}

function addCalendarDays(year: number, month: number, day: number, delta: number): {
  year: number;
  month: number;
  day: number;
} {
  const utc = new Date(Date.UTC(year, month - 1, day + delta));
  return {
    year: utc.getUTCFullYear(),
    month: utc.getUTCMonth() + 1,
    day: utc.getUTCDate(),
  };
}

function isScheduleDayKeyActiveOnWeekday(dayKey: ScheduleDayKey, weekday: number): boolean {
  if (dayKey === 'sun') return weekday === 0;
  if (dayKey === 'fri') return weekday === 5;
  if (dayKey === 'sat') return weekday === 6;
  return weekday >= 1 && weekday <= 4;
}

function formatClockInTimeZone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

/**
 * Convert an admin time range (Windhoek) into the viewer's local clock labels.
 * Uses a fixed Windhoek calendar day as the conversion anchor (CAT has no DST).
 */
export function formatScheduleTimeRangeLocal(
  timeRange: string,
  viewerTimeZone: string = getViewerTimeZone(),
): string {
  const parts = timeRange.split(' - ').map((s) => s.trim());
  if (parts.length < 2) return timeRange;

  let startMin: number;
  let endMin: number;
  try {
    startMin = parseScheduleClockTime(parts[0]);
    endMin = parseScheduleClockTime(parts[1]);
  } catch {
    return timeRange;
  }

  // Anchor on a fixed Windhoek civil date (no DST in CAT).
  const start = windhoekWallTimeToUtc(2026, 1, 15, startMin);
  let end = windhoekWallTimeToUtc(2026, 1, 15, endMin);
  if (endMin <= startMin) {
    end = windhoekWallTimeToUtc(2026, 1, 16, endMin);
  }

  return `${formatClockInTimeZone(start, viewerTimeZone)} - ${formatClockInTimeZone(end, viewerTimeZone)}`;
}

/** Short label for UI: local times, with Namibia note when viewer is not on CAT. */
export function getScheduleTimezoneDisclaimer(
  viewerTimeZone: string = getViewerTimeZone(),
): string {
  if (viewerTimeZone === SCHEDULE_SOURCE_TIMEZONE) {
    return 'Show times are Namibia time (Windhoek, CAT).';
  }
  return 'Show times are converted to your local clock. The station runs on Namibia time (Windhoek, CAT).';
}

/** Next occurrence of a show start on its day tab, strictly after `from` (Windhoek schedule). */
export function getNextShowStartForDayGroup(
  timeRange: string,
  dayKey: ScheduleDayKey,
  from: Date = new Date(),
): Date {
  const minutes = parseScheduleClockTime(getScheduleStartTimeLabel(timeRange));
  const fromWh = getWindhoekParts(from);

  for (let offset = 0; offset <= 8; offset += 1) {
    const day = addCalendarDays(fromWh.year, fromWh.month, fromWh.day, offset);
    const probe = windhoekWallTimeToUtc(day.year, day.month, day.day, 12 * 60);
    const weekday = getWindhoekParts(probe).weekday;
    if (!isScheduleDayKeyActiveOnWeekday(dayKey, weekday)) continue;

    const candidate = windhoekWallTimeToUtc(day.year, day.month, day.day, minutes);
    if (candidate.getTime() > from.getTime()) return candidate;
  }

  const fallback = addCalendarDays(fromWh.year, fromWh.month, fromWh.day, 1);
  return windhoekWallTimeToUtc(fallback.year, fallback.month, fallback.day, minutes);
}

/** Next daily occurrence of a show start, strictly after `from`. */
export function getNextShowStartAt(timeRange: string, from: Date = new Date()): Date {
  return getNextShowStartForDayGroup(timeRange, 'mon_thu', from);
}

/** Following daily occurrence after a show start that already passed. */
export function getFollowingShowStartAt(timeRange: string, afterStart: Date): Date {
  return getNextShowStartAt(timeRange, new Date(afterStart.getTime() + 1000));
}

/**
 * True when `now` falls inside a schedule slot authored in Windhoek time
 * (handles overnight ranges).
 */
export function isScheduleSlotCurrent(timeRange: string, now: Date = new Date()): boolean {
  const parts = timeRange.split(' - ').map((s) => s.trim());
  if (parts.length < 2) return false;

  const wh = getWindhoekParts(now);
  const currentMinutes = wh.hour * 60 + wh.minute;
  const startMinutes = parseScheduleClockTime(parts[0]);
  const endMinutes = parseScheduleClockTime(parts[1]);

  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }

  return currentMinutes >= startMinutes || currentMinutes < endMinutes;
}

/** Mark which schedule row is on air right now (for hero card + schedule modal). */
export function applyCurrentScheduleFlags<T extends { time: string; current?: boolean }>(
  slots: T[],
  now: Date = new Date(),
): T[] {
  return slots.map((slot) => ({
    ...slot,
    current: isScheduleSlotCurrent(slot.time, now),
  }));
}
