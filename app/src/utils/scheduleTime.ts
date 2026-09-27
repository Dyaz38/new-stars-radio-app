import type { ScheduleDayKey } from '../types';

/** Parse a clock label like "10:00 AM" into minutes from midnight. */
export function parseScheduleClockTime(timeStr: string): number {
  const [time, period] = timeStr.trim().split(' ');
  const [hours, minutes] = time.split(':').map(Number);
  let totalMinutes = hours * 60 + minutes;

  if (period === 'PM' && hours !== 12) totalMinutes += 12 * 60;
  if (period === 'AM' && hours === 12) totalMinutes = minutes;

  return totalMinutes;
}

export function getScheduleStartTimeLabel(timeRange: string): string {
  return timeRange.split(' - ')[0].trim();
}

function isScheduleDayKeyActive(dayKey: ScheduleDayKey, date: Date): boolean {
  const weekday = date.getDay();
  if (dayKey === 'sun') return weekday === 0;
  if (dayKey === 'fri') return weekday === 5;
  if (dayKey === 'sat') return weekday === 6;
  return weekday >= 1 && weekday <= 4;
}

function setClockOnDate(date: Date, minutesFromMidnight: number): Date {
  const result = new Date(date);
  result.setSeconds(0, 0);
  result.setHours(Math.floor(minutesFromMidnight / 60), minutesFromMidnight % 60, 0, 0);
  return result;
}

/** Next occurrence of a show start on its day tab, strictly after `from`. */
export function getNextShowStartForDayGroup(
  timeRange: string,
  dayKey: ScheduleDayKey,
  from: Date = new Date(),
): Date {
  const minutes = parseScheduleClockTime(getScheduleStartTimeLabel(timeRange));
  const candidate = setClockOnDate(from, minutes);

  if (isScheduleDayKeyActive(dayKey, candidate) && candidate.getTime() > from.getTime()) {
    return candidate;
  }

  for (let offset = 1; offset <= 7; offset += 1) {
    const day = new Date(from);
    day.setDate(from.getDate() + offset);
    if (!isScheduleDayKeyActive(dayKey, day)) continue;
    const next = setClockOnDate(day, minutes);
    if (next.getTime() > from.getTime()) return next;
  }

  return setClockOnDate(new Date(from.getTime() + 24 * 60 * 60 * 1000), minutes);
}

/** Next daily occurrence of a show start, strictly after `from`. */
export function getNextShowStartAt(timeRange: string, from: Date = new Date()): Date {
  return getNextShowStartForDayGroup(timeRange, 'mon_thu', from);
}

/** Following daily occurrence after a show start that already passed. */
export function getFollowingShowStartAt(timeRange: string, afterStart: Date): Date {
  return getNextShowStartAt(timeRange, new Date(afterStart.getTime() + 1000));
}

/** True when `now` falls inside a daily schedule slot (handles overnight ranges). */
export function isScheduleSlotCurrent(timeRange: string, now: Date = new Date()): boolean {
  const parts = timeRange.split(' - ').map((s) => s.trim());
  if (parts.length < 2) return false;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
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
