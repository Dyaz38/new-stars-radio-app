import { describe, expect, it } from 'vitest';
import { AD_PLACEMENTS } from '../../constants/adPlacements';
import {
  isAdSenseEligibleHost,
  shouldTryAdSenseForHouseAd,
  supportsAdSenseHouseReplacement,
} from '../adSenseEligibility';

describe('adSenseEligibility', () => {
  it('never replaces banners with AdSense while site review fixes are in progress', () => {
    expect(supportsAdSenseHouseReplacement(AD_PLACEMENTS.BANNER_TOP)).toBe(false);
    expect(supportsAdSenseHouseReplacement(AD_PLACEMENTS.EVENTS_MODAL)).toBe(false);
    expect(shouldTryAdSenseForHouseAd(AD_PLACEMENTS.BANNER_TOP)).toBe(false);
    expect(shouldTryAdSenseForHouseAd(AD_PLACEMENTS.EVENTS_MODAL)).toBe(false);
  });

  it('treats production hosts as eligible when AdSense is re-enabled later', () => {
    expect(isAdSenseEligibleHost('www.newstarsradio.com')).toBe(true);
    expect(isAdSenseEligibleHost('new-stars-radio-7bg04w9dz-dyaz-hernandez-projects.vercel.app')).toBe(true);
    expect(isAdSenseEligibleHost('localhost')).toBe(false);
  });
});
