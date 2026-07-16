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
