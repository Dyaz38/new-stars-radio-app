import type { ScheduleDayKey } from '../constants/scheduleDays';
import { SCHEDULE_DAY_KEYS } from '../constants/scheduleDays';
import type { ScheduleByDay, ScheduleShow } from '../types';

function emptyScheduleByDay(): ScheduleByDay {
  return { mon_thu: [], fri: [], sat: [], sun: [] };
}

function isScheduleShow(value: unknown): value is ScheduleShow {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === 'number' &&
    typeof row.time === 'string' &&
    typeof row.show === 'string' &&
    typeof row.dj === 'string' &&
    typeof row.description === 'string'
  );
}

/** Accept legacy `{ items: [] }` or `{ days: { ... } }` from the schedule API. */
export function normalizeSchedulePayload(payload: unknown): ScheduleByDay {
  const result = emptyScheduleByDay();

  if (!payload || typeof payload !== 'object') return result;

  const record = payload as Record<string, unknown>;

  if (record.days && typeof record.days === 'object') {
    const days = record.days as Record<string, unknown>;
    for (const key of SCHEDULE_DAY_KEYS) {
      const raw = days[key];
      if (!Array.isArray(raw)) continue;
      result[key] = raw.filter(isScheduleShow).map((row) => ({
        ...row,
        current: Boolean(row.current),
      }));
    }
    return result;
  }

  if (Array.isArray(record.items)) {
    result.mon_thu = record.items.filter(isScheduleShow).map((row) => ({
      ...row,
      current: Boolean(row.current),
    }));
  }

  return result;
}

export function flattenScheduleDays(days: ScheduleByDay): ScheduleShow[] {
  return SCHEDULE_DAY_KEYS.flatMap((key) => days[key]);
}

export function scheduleDayKeyForShowId(
  days: ScheduleByDay,
  showId: number,
): ScheduleDayKey | null {
  for (const key of SCHEDULE_DAY_KEYS) {
    if (days[key].some((row) => row.id === showId)) return key;
  }
  return null;
}
