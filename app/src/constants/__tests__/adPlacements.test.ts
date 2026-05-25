import { describe, it, expect } from 'vitest';
import { AD_PLACEMENTS } from '../adPlacements';

describe('adPlacements', () => {
  it('defines three distinct placement ids', () => {
    const values = Object.values(AD_PLACEMENTS);
    expect(values).toContain('banner_top');
    expect(values).toContain('banner_bottom');
    expect(values).toContain('events_modal');
    expect(new Set(values).size).toBe(3);
  });
});
