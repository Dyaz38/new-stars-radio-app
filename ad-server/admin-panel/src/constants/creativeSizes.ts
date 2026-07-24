/** IAB banner presets — keep in sync with ad-server/app/constants/placements.py */

export const SIZE_TOLERANCE = 0.08;

export const CREATIVE_SIZE_PRESETS = [
  {
    id: "728x90",
    label: "728 × 90 — Desktop top banner",
    shortLabel: "728 × 90",
    width: 728,
    height: 90,
    placementTags: ["Top banner (desktop)", "Events modal (scaled fallback)"],
    eventsModalPreferred: false,
  },
  {
    id: "320x50",
    label: "320 × 50 — Mobile banner & Events modal",
    shortLabel: "320 × 50",
    width: 320,
    height: 50,
    placementTags: ["Top banner (mobile)", "Events modal (best fit)"],
    eventsModalPreferred: true,
  },
] as const;

export type CreativeSizePresetId = (typeof CREATIVE_SIZE_PRESETS)[number]["id"];

export function sizeMatches(
  width: number,
  height: number,
  targetW: number,
  targetH: number,
): boolean {
  if (targetW <= 0 || targetH <= 0) return false;
  const wOk = Math.abs(width - targetW) / targetW <= SIZE_TOLERANCE;
  const hOk = Math.abs(height - targetH) / targetH <= SIZE_TOLERANCE;
  return wOk && hOk;
}

export function matchCreativeSizePreset(
  width: number,
  height: number,
): (typeof CREATIVE_SIZE_PRESETS)[number] | null {
  for (const preset of CREATIVE_SIZE_PRESETS) {
    if (sizeMatches(width, height, preset.width, preset.height)) {
      return preset;
    }
  }
  return null;
}

export function presetForCreativeDimensions(
  width: number,
  height: number,
): CreativeSizePresetId {
  return matchCreativeSizePreset(width, height)?.id ?? "728x90";
}

export function placementTagsForDimensions(width: number, height: number): string[] {
  const preset = matchCreativeSizePreset(width, height);
  if (preset) return [...preset.placementTags];
  return [`Custom ${width} × ${height}`];
}

export async function readImageFileDimensions(
  file: File,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image dimensions"));
    };
    img.src = url;
  });
}

export function isDesktopBannerSize(width: number, height: number): boolean {
  return sizeMatches(width, height, 728, 90);
}

export function isMobileBannerSize(width: number, height: number): boolean {
  return sizeMatches(width, height, 320, 50);
}

export interface CampaignBannerCoverage {
  campaignId: string;
  campaignName: string;
  campaignStatus: string;
  hasDesktopBanner: boolean;
  hasMobileBanner: boolean;
  needsMobileBanner: boolean;
}

export interface CreativeForCoverage {
  campaign_id: string;
  image_width: number;
  image_height: number;
  status: string;
  name: string;
  click_url: string;
  alt_text: string;
}

export function buildCampaignBannerCoverage(
  campaigns: Array<{ id: string; name: string; status: string }>,
  creatives: CreativeForCoverage[],
): CampaignBannerCoverage[] {
  return campaigns
    .filter((campaign) => campaign.status === "active")
    .map((campaign) => {
      const activeCreatives = creatives.filter(
        (creative) =>
          creative.campaign_id === campaign.id && creative.status === "active",
      );
      const hasDesktopBanner = activeCreatives.some((creative) =>
        isDesktopBannerSize(creative.image_width, creative.image_height),
      );
      const hasMobileBanner = activeCreatives.some((creative) =>
        isMobileBannerSize(creative.image_width, creative.image_height),
      );
      return {
        campaignId: campaign.id,
        campaignName: campaign.name,
        campaignStatus: campaign.status,
        hasDesktopBanner,
        hasMobileBanner,
        needsMobileBanner: hasDesktopBanner && !hasMobileBanner,
      };
    })
    .filter((row) => row.needsMobileBanner)
    .sort((a, b) => a.campaignName.localeCompare(b.campaignName));
}

export function findActiveDesktopCreativeForCampaign(
  creatives: CreativeForCoverage[],
  campaignId: string,
): CreativeForCoverage | undefined {
  return creatives.find(
    (creative) =>
      creative.campaign_id === campaignId &&
      creative.status === "active" &&
      isDesktopBannerSize(creative.image_width, creative.image_height),
  );
}

export function suggestMobileCreativeDefaults(
  campaignName: string,
  desktopCreative?: Pick<CreativeForCoverage, "name" | "click_url" | "alt_text">,
): { name: string; click_url: string; alt_text: string } {
  return {
    name: desktopCreative?.name
      ? `${desktopCreative.name} (320×50)`
      : `${campaignName} 320×50`,
    click_url: desktopCreative?.click_url ?? "",
    alt_text: desktopCreative?.alt_text ?? `${campaignName} mobile banner`,
  };
}
