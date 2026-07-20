import { AD_PLACEMENTS, type AdPlacement } from '../constants/adPlacements';
import { getAdSensePlacementKey, isAdSenseFallbackConfigured } from '../components/AdSenseFallback';

/** Top banner always uses ad-server images so preview and production behave the same. */
export function supportsAdSenseHouseReplacement(placement: AdPlacement): boolean {
  return placement === AD_PLACEMENTS.EVENTS_MODAL;
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
