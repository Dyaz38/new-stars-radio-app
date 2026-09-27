import { describe, expect, it } from 'vitest';
import { normalizeSchedulePayload } from '../scheduleNormalize';

describe('normalizeSchedulePayload', () => {
  it('reads day-grouped schedule from API', () => {
    const result = normalizeSchedulePayload({
      days: {
        mon_thu: [{ id: 1, time: '6:00 AM - 7:00 AM', show: 'A', dj: 'DJ', description: 'Desc', current: false }],
        fri: [],
        sat: [],
        sun: [{ id: 2, time: '8:00 AM - 9:00 AM', show: 'B', dj: 'DJ', description: 'Desc', current: false }],
      },
    });
    expect(result.mon_thu).toHaveLength(1);
    expect(result.sun).toHaveLength(1);
  });

  it('migrates legacy items array to mon_thu', () => {
    const result = normalizeSchedulePayload({
      items: [{ id: 3, time: '1:00 PM - 2:00 PM', show: 'Legacy', dj: 'DJ', description: 'Old', current: false }],
    });
    expect(result.mon_thu).toHaveLength(1);
    expect(result.fri).toHaveLength(0);
  });
});
