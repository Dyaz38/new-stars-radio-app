import type { AdPlacement } from '../constants/adPlacements';
import { getAdSensePlacementKey, isAdSenseFallbackConfigured } from '../components/AdSenseFallback';

/** Google AdSense only serves on approved production domains — not Vercel previews or localhost. */
export function isAdSenseEligibleHost(hostname: string = window.location.hostname): boolean {
  const host = hostname.toLowerCase();
  if (!host) return false;
  if (host === 'localhost' || host === '127.0.0.1') return false;
  if (host.endsWith('.vercel.app')) return false;
  return host === 'newstarsradio.com' || host === 'www.newstarsradio.com';
}

export function shouldTryAdSenseForHouseAd(placement: AdPlacement): boolean {
  return isAdSenseFallbackConfigured(placement) && isAdSenseEligibleHost();
}

export function adSensePlacementKey(placement: AdPlacement) {
  return getAdSensePlacementKey(placement);
}
