/** Ad slot identifiers — must match values accepted by POST /api/v1/ads/request */
export const AD_PLACEMENTS = {
  BANNER_TOP: 'banner_top',
  BANNER_BOTTOM: 'banner_bottom',
  EVENTS_MODAL: 'events_modal',
} as const;

export type AdPlacement = (typeof AD_PLACEMENTS)[keyof typeof AD_PLACEMENTS];

/** Fixed slot dimensions for placements that are not responsive */
export const PLACEMENT_SLOT_SIZES: Partial<
  Record<AdPlacement, { width: number; height: number }>
> = {
  [AD_PLACEMENTS.EVENTS_MODAL]: { width: 300, height: 250 },
};
