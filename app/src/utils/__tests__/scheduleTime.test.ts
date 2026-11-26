import { describe, expect, it } from 'vitest';
import {
  applyCurrentScheduleFlags,
  formatScheduleTimeRangeLocal,
  isScheduleSlotCurrent,
  parseScheduleClockTime,
  windhoekWallTimeToUtc,
} from '../scheduleTime';

describe('scheduleTime', () => {
  it('parses AM/PM clock labels', () => {
    expect(parseScheduleClockTime('12:00 AM')).toBe(0);
    expect(parseScheduleClockTime('12:30 AM')).toBe(30);
    expect(parseScheduleClockTime('1:00 PM')).toBe(13 * 60);
  });

  it('detects overnight slot as current at 2 AM Windhoek', () => {
    const now = windhoekWallTimeToUtc(2026, 7, 10, 2 * 60);
    expect(isScheduleSlotCurrent('12:00 AM - 5:00 AM', now)).toBe(true);
    expect(isScheduleSlotCurrent('5:00 AM - 7:00 AM', now)).toBe(false);
  });

  it('marks only the matching row in applyCurrentScheduleFlags', () => {
    const slots = [
      { id: 1, time: '12:00 AM - 5:00 AM', show: 'Overnight', current: false },
      { id: 2, time: '5:00 AM - 7:00 AM', show: 'Morning', current: false },
    ];
    const now = windhoekWallTimeToUtc(2026, 7, 10, 2 * 60);
    const flagged = applyCurrentScheduleFlags(slots, now);
    expect(flagged[0].current).toBe(true);
    expect(flagged[1].current).toBe(false);
  });

  it('keeps Windhoek labels when viewer is Africa/Windhoek', () => {
    const formatted = formatScheduleTimeRangeLocal('6:00 AM - 7:30 AM', 'Africa/Windhoek');
    expect(formatted.replace(/\u202f/g, ' ')).toBe('6:00 AM - 7:30 AM');
  });

  it('converts Windhoek range into another timezone', () => {
    // Anchor date is mid-January → America/New_York is EST (UTC-5).
    // 6:00 AM Windhoek = 4:00 AM UTC = 11:00 PM EST; 7:30 AM → 12:30 AM.
    const formatted = formatScheduleTimeRangeLocal('6:00 AM - 7:30 AM', 'America/New_York').replace(
      /\u202f/g,
      ' ',
    );
    expect(formatted).toMatch(/11:00 PM - 12:30 AM/i);
  });
});
