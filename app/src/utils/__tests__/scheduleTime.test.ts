import { describe, expect, it } from 'vitest';
import {
  applyCurrentScheduleFlags,
  isScheduleSlotCurrent,
  parseScheduleClockTime,
} from '../scheduleTime';

describe('scheduleTime', () => {
  it('parses AM/PM clock labels', () => {
    expect(parseScheduleClockTime('12:00 AM')).toBe(0);
    expect(parseScheduleClockTime('12:30 AM')).toBe(30);
    expect(parseScheduleClockTime('1:00 PM')).toBe(13 * 60);
  });

  it('detects overnight slot as current at 2 AM', () => {
    const now = new Date(2026, 6, 10, 2, 0, 0);
    expect(isScheduleSlotCurrent('12:00 AM - 5:00 AM', now)).toBe(true);
    expect(isScheduleSlotCurrent('5:00 AM - 7:00 AM', now)).toBe(false);
  });

  it('marks only the matching row in applyCurrentScheduleFlags', () => {
    const slots = [
      { id: 1, time: '12:00 AM - 5:00 AM', show: 'Overnight', current: false },
      { id: 2, time: '5:00 AM - 7:00 AM', show: 'Morning', current: false },
    ];
    const now = new Date(2026, 6, 10, 2, 0, 0);
    const flagged = applyCurrentScheduleFlags(slots, now);
    expect(flagged[0].current).toBe(true);
    expect(flagged[1].current).toBe(false);
  });
});
