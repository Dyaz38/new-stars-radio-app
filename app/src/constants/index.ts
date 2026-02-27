// Configuration constants for better maintainability

export const RADIO_CONFIG = {
  STATION_NAME: 'NEW STARS RADIO',
  TAGLINE: "Tomorrow's Stars, Today",
  STREAM_URL: 'https://newstarsradio.out.airtime.pro/newstarsradio_a',
  DEFAULT_VOLUME: 75,
  METADATA_REFRESH_INTERVAL: 60000, // 60 seconds (reduced frequency)
  LISTENER_UPDATE_INTERVAL: 5000,   // 5 seconds
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
  AD_SERVER: import.meta.env.VITE_AD_SERVER_URL || 'https://new-stars-radio-app-production.up.railway.app/api/v1'
} as const;

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
  USER_PREFERENCES: 'newstarsradio-preferences',
  LIKED_SONGS: 'newstarsradio-liked-songs',
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
  { id: 1, time: "5:00 AM - 6:00 AM", show: "Early Bird Music", dj: "Auto DJ", description: "Wake up with your favorite hits", current: false },
  { id: 2, time: "6:00 AM - 10:00 AM", show: "Morning Drive", dj: "Sarah Martinez", description: "Start your day right with Sarah! News, traffic, and the hottest pop hits", current: true },
  { id: 3, time: "10:00 AM - 2:00 PM", show: "Mid-Morning Mix", dj: "Jake Thompson", description: "Non-stop music to keep your energy up", current: false },
  { id: 4, time: "2:00 PM - 6:00 PM", show: "Afternoon Groove", dj: "Maria Lopez", description: "The perfect soundtrack for your afternoon", current: false },
  { id: 5, time: "6:00 PM - 8:00 PM", show: "Drive Time Hits", dj: "Alex Chen", description: "Beating traffic with the biggest hits", current: false },
  { id: 6, time: "8:00 PM - 10:00 PM", show: "Pop Tonight", dj: "Emma Wilson", description: "Tonight's biggest pop anthems and new releases", current: false },
  { id: 7, time: "10:00 PM - 12:00 AM", show: "Late Night Vibes", dj: "Ryan Brooks", description: "Chill out with smooth pop and indie favorites", current: false },
  { id: 8, time: "12:00 AM - 5:00 AM", show: "Overnight Mix", dj: "Auto DJ", description: "Continuous music through the night", current: false }
];
