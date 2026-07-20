import { describe, expect, it } from 'vitest';
import { AD_PLACEMENTS } from '../../constants/adPlacements';
import {
  isAdSenseEligibleHost,
  shouldTryAdSenseForHouseAd,
  supportsAdSenseHouseReplacement,
} from '../adSenseEligibility';

describe('adSenseEligibility', () => {
  it('never replaces the top banner with AdSense (uses ad-server images everywhere)', () => {
    expect(supportsAdSenseHouseReplacement(AD_PLACEMENTS.BANNER_TOP)).toBe(false);
    expect(shouldTryAdSenseForHouseAd(AD_PLACEMENTS.BANNER_TOP)).toBe(false);
  });

  it('allows AdSense only for the Events modal placement', () => {
    expect(supportsAdSenseHouseReplacement(AD_PLACEMENTS.EVENTS_MODAL)).toBe(true);
  });

  it('treats Vercel preview hosts the same as production for eligibility checks', () => {
    expect(isAdSenseEligibleHost('www.newstarsradio.com')).toBe(true);
    expect(isAdSenseEligibleHost('new-stars-radio-7bg04w9dz-dyaz-hernandez-projects.vercel.app')).toBe(true);
    expect(isAdSenseEligibleHost('localhost')).toBe(false);
  });
});
