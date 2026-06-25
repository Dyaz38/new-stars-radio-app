import { useEffect } from 'react';
import { RADIO_CONFIG } from '../constants';

interface UseMediaSessionOptions {
  isPlaying: boolean;
  title: string;
  artist: string;
  artworkUrl?: string;
  onPlay: () => void;
  onPause: () => void;
}

export function useMediaSession({
  isPlaying,
  title,
  artist,
  artworkUrl,
  onPlay,
  onPause,
}: UseMediaSessionOptions) {
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    const artwork = artworkUrl?.trim()
      ? [{ src: artworkUrl, sizes: '512x512', type: 'image/png' as const }]
      : [
          { src: '/station-icon-192.png', sizes: '192x192', type: 'image/png' as const },
          { src: '/station-icon-512.png', sizes: '512x512', type: 'image/png' as const },
        ];

    navigator.mediaSession.metadata = new MediaMetadata({
      title: title || RADIO_CONFIG.STATION_NAME,
      artist: artist || RADIO_CONFIG.TAGLINE,
      album: 'Live on New Stars Radio',
      artwork,
    });
  }, [title, artist, artworkUrl]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    navigator.mediaSession.setActionHandler('play', () => {
      onPlay();
    });
    navigator.mediaSession.setActionHandler('pause', () => {
      onPause();
    });

    return () => {
      navigator.mediaSession.setActionHandler('play', null);
      navigator.mediaSession.setActionHandler('pause', null);
    };
  }, [onPlay, onPause]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }, [isPlaying]);
}
