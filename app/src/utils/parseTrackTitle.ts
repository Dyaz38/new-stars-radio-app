/** Split Airtime-style "Artist - Title" (title may contain further " - "). */
export function parseArtistTitle(trackInfo: string): { artist: string; title: string } {
  const trimmed = trackInfo.trim();
  const sep = ' - ';
  const idx = trimmed.indexOf(sep);
  if (idx === -1) {
    return { artist: 'New Stars Radio', title: trimmed };
  }
  return {
    artist: trimmed.slice(0, idx).trim() || 'New Stars Radio',
    title: trimmed.slice(idx + sep.length).trim() || 'Live Stream',
  };
}
