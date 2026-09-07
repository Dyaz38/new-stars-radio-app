import type { AdPlacement } from '../constants/adPlacements';
import { getAdSensePlacementKey, isAdSenseFallbackConfigured } from '../components/AdSenseFallback';

/**
 * AdSense on thin modal screens was flagged during site review.
 * Keep disabled until Google re-approves a content-rich placement.
 */
export function supportsAdSenseHouseReplacement(_placement: AdPlacement): boolean {
  return false;
}

export function isAdSenseEligibleHost(hostname: string = window.location.hostname): boolean {
  const host = hostname.toLowerCase();
  if (!host) return false;
  if (host === 'localhost' || host === '127.0.0.1') return false;
  return true;
}

export function shouldTryAdSenseForHouseAd(placement: AdPlacement): boolean {
  return (
    supportsAdSenseHouseReplacement(placement) &&
    isAdSenseFallbackConfigured(placement) &&
    isAdSenseEligibleHost()
  );
}

export function adSensePlacementKey(placement: AdPlacement) {
  return getAdSensePlacementKey(placement);
}
