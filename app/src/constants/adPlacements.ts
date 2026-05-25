/** Ad slot identifiers — must match values accepted by POST /api/v1/ads/request */
export const AD_PLACEMENTS = {
  BANNER_TOP: 'banner_top',
  BANNER_BOTTOM: 'banner_bottom',
  EVENTS_MODAL: 'events_modal',
} as const;

export type AdPlacement = (typeof AD_PLACEMENTS)[keyof typeof AD_PLACEMENTS];
