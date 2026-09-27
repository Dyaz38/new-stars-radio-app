import type { ScheduleDayKey } from '../types';

export type { ScheduleDayKey };

export const SCHEDULE_DAY_KEYS: ScheduleDayKey[] = ['mon_thu', 'fri', 'sat', 'sun'];

export const SCHEDULE_DAY_LABELS: Record<ScheduleDayKey, string> = {
  mon_thu: 'Mon – Thu',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};

export const SCHEDULE_DAY_LABELS_LONG: Record<ScheduleDayKey, string> = {
  mon_thu: 'Monday – Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};

/** Which schedule tab applies to a calendar date (local timezone). */
export function getScheduleDayKeyForDate(date: Date = new Date()): ScheduleDayKey {
  const day = date.getDay();
  if (day === 0) return 'sun';
  if (day === 5) return 'fri';
  if (day === 6) return 'sat';
  return 'mon_thu';
}
