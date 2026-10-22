import { describe, expect, it } from 'vitest';
import type { StationEvent } from '../../types';
import { filterListenerEvents, isEventPast } from '../eventVisibility';

const base: StationEvent = {
  id: 1,
  title: 'Test',
  dateLabel: 'Soon',
  location: 'Windhoek',
  isOnline: false,
  isThisWeek: true,
  status: 'upcoming',
  description: '',
};

describe('isEventPast', () => {
  it('uses ends_at when present', () => {
    const event: StationEvent = {
      ...base,
      startsAt: '2020-01-01T18:00:00.000Z',
      endsAt: '2020-01-01T20:00:00.000Z',
    };
    expect(isEventPast(event, new Date('2020-01-01T21:00:00.000Z'))).toBe(true);
    expect(isEventPast(event, new Date('2020-01-01T19:00:00.000Z'))).toBe(false);
  });

  it('falls back to status when no calendar times', () => {
    expect(isEventPast({ ...base, status: 'past' })).toBe(true);
    expect(isEventPast({ ...base, status: 'upcoming' })).toBe(false);
  });
});

describe('filterListenerEvents', () => {
  it('drops past events', () => {
    const upcoming: StationEvent = {
      ...base,
      id: 2,
      startsAt: '2099-06-01T18:00:00.000Z',
    };
    const past: StationEvent = {
      ...base,
      id: 3,
      status: 'past',
    };
    expect(filterListenerEvents([upcoming, past])).toEqual([upcoming]);
  });
});
