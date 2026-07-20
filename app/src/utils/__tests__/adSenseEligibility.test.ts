import { describe, expect, it } from 'vitest';
import { AD_PLACEMENTS } from '../../constants/adPlacements';
import { isAdSenseEligibleHost, shouldTryAdSenseForHouseAd } from '../adSenseEligibility';

describe('adSenseEligibility', () => {
  it('allows AdSense only on production listener domains', () => {
    expect(isAdSenseEligibleHost('www.newstarsradio.com')).toBe(true);
    expect(isAdSenseEligibleHost('newstarsradio.com')).toBe(true);
    expect(isAdSenseEligibleHost('new-stars-radio-7bg04w9dz-dyaz-hernandez-projects.vercel.app')).toBe(false);
    expect(isAdSenseEligibleHost('localhost')).toBe(false);
  });

  it('does not replace house ads with AdSense on preview hosts even when env is set', () => {
    expect(shouldTryAdSenseForHouseAd(AD_PLACEMENTS.BANNER_TOP)).toBe(false);
  });
});
