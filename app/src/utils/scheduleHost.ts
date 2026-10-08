/** Listener-facing label when no named host is on air (100% automated programming). */
export const AUTOMATED_PROGRAMME_LABEL = 'Automated Programme';

const LEGACY_AUTO_DJ = /^auto\s+dj$/i;
const PLACEHOLDER_DJ = /^dj\s+name$/i;
const LEGACY_AUTOMATED = /^automated\s+programme$/i;

export function formatScheduleHostLabel(dj: string | undefined | null): string {
  const name = (dj ?? '').trim();
  if (!name || LEGACY_AUTO_DJ.test(name) || PLACEHOLDER_DJ.test(name) || LEGACY_AUTOMATED.test(name)) {
    return AUTOMATED_PROGRAMME_LABEL;
  }
  return name;
}

export function isAutomatedScheduleHost(dj: string | undefined | null): boolean {
  return formatScheduleHostLabel(dj) === AUTOMATED_PROGRAMME_LABEL;
}

/** Avatar initials for schedule rows (photos later). */
export function getScheduleHostInitials(dj: string | undefined | null): string {
  if (isAutomatedScheduleHost(dj)) return '♪';
  const name = (dj ?? '').trim();
  if (!name) return '?';
  const withoutPrefix = name.replace(/^DJ\s+/i, '').trim();
  const words = (withoutPrefix || name).split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
  }
  return words[0].slice(0, 2).toUpperCase();
}
