/** Built-in New Stars promo when the ad API is unreachable (matches ad-server house assets). */
export const HOUSE_AD = {
  CLICK_URL: 'mailto:ads@newstarsradio.com?subject=Advertise%20on%20New%20Stars%20Radio',
  ALT: "New Stars Radio — Advertise With Us",
  MOBILE: { url: '/ads/newstars-house-320x50.png', width: 320, height: 50 },
  DESKTOP: { url: '/ads/newstars-house-728x90.png', width: 728, height: 90 },
} as const;

export function getLocalHouseAd(compact: boolean, viewportWidth: number) {
  if (compact || viewportWidth < 768) {
    return HOUSE_AD.MOBILE;
  }
  return HOUSE_AD.DESKTOP;
}
