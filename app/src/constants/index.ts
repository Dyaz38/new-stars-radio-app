import type { StationEvent } from "../types";

// Configuration constants for better maintainability

export const RADIO_CONFIG = {
  STATION_NAME: 'NEW STARS RADIO',
  TAGLINE: "Tomorrow's Stars, Today",
  STATION_LOGO_URL: '/station-logo.png',
  STATION_ICON_URL: '/station-icon-512.png',
  STREAM_URL: 'https://newstarsradio.out.airtime.pro/newstarsradio_a',
  DEFAULT_VOLUME: 75,
  METADATA_REFRESH_INTERVAL: 60000, // 60 seconds (reduced frequency)
  /** Poll Icecast listener count (proxied by backend; avoids CORS). */
  LISTENER_POLL_INTERVAL: 30000, // 30 seconds
  SCHEDULE_UPDATE_INTERVAL: 60000,  // 1 minute
} as const;

export const API_ENDPOINTS = {
  METADATA: [
    'https://newstarsradio.airtime.pro/api/live-info',
    'https://newstarsradio.airtime.pro/api/live-info-v2', 
    'https://newstarsradio.airtime.pro/embed/data',
    'https://newstarsradio.airtime.pro/api/live-info/format/json',
    'http://newstarsradio.out.airtime.pro:8000/status-json.xsl'
  ],
  MUSICBRAINZ_SEARCH: 'https://musicbrainz.org/ws/2/release',
  COVERART_ARCHIVE: 'https://coverartarchive.org/release',
  ITUNES: 'https://itunes.apple.com/search',
  GENIUS_SEARCH: 'https://api.genius.com/search',
  GENIUS_SONGS: 'https://api.genius.com/songs',
  AD_SERVER: (import.meta.env.VITE_AD_SERVER_URL || 'https://new-stars-radio-app-production.up.railway.app/api/v1').replace(/\/$/, '')
} as const;

/** Real-time listener count (Icecast via ad server proxy). */
export const getStreamListenersUrl = () => `${API_ENDPOINTS.AD_SERVER}/stream/listeners`;
export const getScheduleUrl = () => `${API_ENDPOINTS.AD_SERVER}/schedule/`;
export const getEventsUrl = () => `${API_ENDPOINTS.AD_SERVER}/events/`;

/** Origin for resolving relative image paths from the ad server (no /api/v1). */
export function getAdServerOrigin(): string {
  const raw =
    (import.meta.env.VITE_AD_SERVER_URL as string | undefined)?.trim() ||
    "https://new-stars-radio-app-production.up.railway.app/api/v1";
  return raw.replace(/[\r\n]+/g, "").replace(/\/+$/, "").replace(/\/api\/v1\/?$/i, "");
}

/** Full URL for station event images (https, or relative from API host). */
export function resolveStationEventImageUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  const u = url.trim();
  if (/^https?:\/\//i.test(u)) {
    try {
      return encodeURI(u);
    } catch {
      return u;
    }
  }
  const origin = getAdServerOrigin();
  const path = u.startsWith('/') ? u : `/${u}`;
  return `${origin}${path}`;
}

// MusicBrainz API configuration
export const MUSICBRAINZ_CONFIG = {
  USER_AGENT: 'NewStarsRadio/1.0.0 (https://localhost:5173)',
  REQUEST_TIMEOUT: 10000, // 10 seconds
  MAX_RETRIES: 1, // Reduced to respect rate limits
  SEARCH_LIMIT: 3, // Reduced to minimize API calls
  RATE_LIMIT_DELAY: 1100, // 1.1 seconds between calls (respects 1 call/second rule)
} as const;

// Genius API configuration
export const GENIUS_CONFIG = {
  REQUEST_TIMEOUT: 5000, // 5 seconds (reduced for faster failure)
  MAX_RETRIES: 2,
  RATE_LIMIT_DELAY: 500, // 0.5 seconds between calls
} as const;

export const STORAGE_KEYS = {
  SCHEDULE: 'newstarsradio-schedule',
  EVENTS: 'newstarsradio-events',
  /** Last location filter in the Events modal (listener app; may be a full venue or substring). */
  EVENT_CITY_FILTER: 'newstarsradio-event-city-filter',
  /** `'1'` when the listener chose calmer / less motion UI (visualizer). */
  REDUCE_MOTION: 'newstarsradio-reduce-motion',
  USER_PREFERENCES: 'newstarsradio-preferences',
  LIKED_SONGS: 'newstarsradio-liked-songs',
  /** Anonymous per-device id for server-side like catalog */
  LISTENER_ID: 'newstarsradio-listener-id',
  /** Event ids the listener asked to be reminded about (local device). */
  EVENT_REMINDERS: 'newstarsradio-event-reminders',
  /** Schedule show ids the listener asked to be reminded about (local device). */
  SHOW_REMINDERS: 'newstarsradio-show-reminders',
} as const;

export const GRADIENT_CLASSES = [
  'from-purple-500 to-pink-500',
  'from-blue-500 to-cyan-500', 
  'from-green-500 to-teal-500',
  'from-orange-500 to-red-500',
  'from-indigo-500 to-purple-500',
  'from-pink-500 to-rose-500'
] as const;

export const DEFAULT_SCHEDULE = [
  { id: 1, time: "12:00 AM - 5:00 AM", show: "Overnight Stars Mix", dj: "Auto DJ", description: "Non-stop overnight rotation of rising Hip-Hop, R&B, and Smooth Jazz artists.", current: false },
  { id: 2, time: "5:00 AM - 7:00 AM", show: "Sunrise Smooth Jazz", dj: "DJ Marcus", description: "Ease into the day with mellow jazz and soulful instrumentals.", current: false },
  { id: 3, time: "7:00 AM - 10:00 AM", show: "Morning Hip-Hop Rise", dj: "DJ Kaya", description: "Fresh bars and beats from tomorrow's stars — news and community shout-outs.", current: false },
  { id: 4, time: "10:00 AM - 2:00 PM", show: "Midday R&B Flow", dj: "DJ Lila", description: "Midday grooves and new voices in R&B — perfect for work or the road.", current: false },
  { id: 5, time: "2:00 PM - 6:00 PM", show: "Afternoon Discovery", dj: "New Stars Team", description: "Deep cuts and debut tracks from unsigned artists we're breaking first.", current: false },
  { id: 6, time: "6:00 PM - 9:00 PM", show: "Drive Time Heat", dj: "DJ Apex", description: "Peak-hour energy — Hip-Hop and R&B anthems for the commute home.", current: false },
  { id: 7, time: "9:00 PM - 12:00 AM", show: "Late Night Lounge", dj: "DJ Nova", description: "Smooth Jazz and slow R&B to wind down the evening.", current: false },
];

/** Fallback when the events API is unavailable — empty; house promo card handles empty state. */
export const DEFAULT_EVENTS: StationEvent[] = [];
