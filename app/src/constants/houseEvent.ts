/** Built-in promo when no community events are listed — mirrors the house ad pattern. */
export const HOUSE_EVENT = {
  TITLE: 'Promote Your Event',
  TAGLINE: 'List your show on New Stars Radio',
  DESCRIPTION:
    'Concerts, showcases, livestreams, and listener meetups — reach our audience in the Events tab.',
  CLICK_URL:
    'mailto:events@newstarsradio.com?subject=Promote%20Your%20Event%20on%20New%20Stars%20Radio',
  CTA_LABEL: 'Contact us to get listed',
} as const;

/** Drop seed/demo poster URLs (e.g. picsum) so only real uploads show. */
export function isPlaceholderEventImage(url: string | null | undefined): boolean {
  if (!url?.trim()) return false;
  const lower = url.trim().toLowerCase();
  return lower.includes('picsum.photos') || lower.includes('placehold.co') || lower.includes('placeholder.com');
}

export function sanitizeEventImageUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  return isPlaceholderEventImage(url) ? null : url.trim();
}
