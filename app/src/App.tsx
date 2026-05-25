import { useState, useEffect, useMemo, useCallback } from 'react';
import { Calendar, Users, Radio, Signal, Settings, Play, Pause, Volume2, Trash2, Download, ExternalLink, MapPin } from 'lucide-react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PlayerControls } from './components/PlayerControls';
import { NowPlaying } from './components/NowPlaying';
import { AudioVisualizer } from './components/AudioVisualizer';
import { useAudioPlayer } from './hooks/useAudioPlayer';
import { useMetadata } from './hooks/useMetadata';
import { useLikedSongs } from './hooks/useLikedSongs';
import { usePWA } from './hooks/usePWA';
import { useDynamicTheme } from './hooks/useDynamicTheme';
import { useNotifications } from './hooks/useNotifications';
import { useListenerGeo } from './hooks/useListenerGeo';
import { PWAPrompt } from './components/PWAPrompt';
import { AdBanner } from './components/AdBanner';
import { AD_PLACEMENTS } from './constants/adPlacements';
import type { ScheduleShow, StationEvent } from './types';

import {
  RADIO_CONFIG,
  DEFAULT_SCHEDULE,
  DEFAULT_EVENTS,
  STORAGE_KEYS,
  getScheduleUrl,
  getEventsUrl,
  resolveStationEventImageUrl,
} from './constants';
import {
  buildGoogleCalendarUrl,
  buildIcsContent,
  downloadIcsFile,
  getEventTimeRange,
  getThisWeekSegment,
} from './utils/eventCalendar';
import { filterEventsForCountry } from './utils/eventGeo';

type EventCategory = 'all' | 'mon-thu' | 'weekend' | 'online';

type EventImageLightbox = { src: string; alt: string };

type EventApiRow = {
  id: number;
  title: string;
  date_label: string;
  location: string;
  is_online: boolean;
  is_this_week: boolean;
  status: 'upcoming' | 'live' | 'past';
  description?: string;
  starts_at?: string | null;
  ends_at?: string | null;
  image_url?: string | null;
  country_code?: string | null;
};

function mapEventFromApi(row: EventApiRow): StationEvent {
  return {
    id: row.id,
    title: row.title,
    dateLabel: row.date_label,
    location: row.location,
    isOnline: row.is_online,
    isThisWeek: row.is_this_week,
    status: row.status,
    description: row.description ?? '',
    startsAt: row.starts_at ?? null,
    endsAt: row.ends_at ?? null,
    imageUrl: row.image_url ?? null,
    countryCode: row.country_code ?? null,
  };
}

function readEventCityFilter(): string {
  try {
    return localStorage.getItem(STORAGE_KEYS.EVENT_CITY_FILTER)?.trim() ?? '';
  } catch {
    return '';
  }
}

function writeEventCityFilter(value: string) {
  try {
    if (value.trim()) localStorage.setItem(STORAGE_KEYS.EVENT_CITY_FILTER, value.trim());
    else localStorage.removeItem(STORAGE_KEYS.EVENT_CITY_FILTER);
  } catch {
    /* ignore */
  }
}

/** Match chosen venue: exact line or substring (supports older saved filters). */
function eventMatchesLocationFilter(event: StationEvent, selected: string): boolean {
  if (!selected.trim()) return true;
  const sel = selected.trim().toLowerCase();
  const loc = event.location.trim().toLowerCase();
  return loc === sel || loc.includes(sel);
}

const RadioStreamingApp = () => {
  // Custom hooks for clean separation of concerns
  const {
    isPlaying,
    isLoading,
    volume,
    isMuted,
    isConnected,
    audioRef,
    togglePlayPause,
    handleVolumeChange,
    toggleMute,
  } = useAudioPlayer();

  const {
    currentSong,
    nextSong,
    isLoadingMetadata,
    listeners,
    fetchMetadata,
    refreshCurrentArtwork,
    getGradientClass,
  } = useMetadata();

  const {
    isLiked,
    toggleLike,
    updateCurrentSong,
    stopTrackingPlaytime,
  } = useLikedSongs();

  const {
    isInstallable,
    isOffline,
    updateAvailable,
    installApp,
    updateServiceWorker,
  } = usePWA();

  const {
    updateThemeFromCoverArt
  } = useDynamicTheme();

  const {
    notifyNowPlaying,
    notifyFavoriteArtist,
    notifyListenerMilestone
  } = useNotifications();

  const listenerGeo = useListenerGeo();

  // UI state
  const [currentShow, setCurrentShow] = useState('Morning Drive');
  const [currentDJ, setCurrentDJ] = useState('Sarah Martinez');
  const [showSchedule, setShowSchedule] = useState(false);
  const [showEvents, setShowEvents] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [eventImageLightbox, setEventImageLightbox] = useState<EventImageLightbox | null>(null);
  const [eventFilter, setEventFilter] = useState<EventCategory>('all');
  const [eventCityFilter, setEventCityFilter] = useState<string>(() => readEventCityFilter());
  const [reduceMotion, setReduceMotion] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.REDUCE_MOTION) === '1';
    } catch {
      return false;
    }
  });
  const [schedule, setSchedule] = useState<ScheduleShow[]>([...DEFAULT_SCHEDULE]);
  const [eventsList, setEventsList] = useState<StationEvent[]>([]);
  const [eventsListenerCountry, setEventsListenerCountry] = useState<string | null>(null);

  // Memoized expensive computations
  const shareMessage = useMemo(() => {
    return `🎵 Currently listening to "${currentSong.title}" by ${currentSong.artist} on ${RADIO_CONFIG.STATION_NAME}! 📻`;
  }, [currentSong.title, currentSong.artist]);
  const filteredEvents = useMemo(() => {
    let list = eventsList;
    if (eventFilter === 'mon-thu')
      list = list.filter((event) => getThisWeekSegment(event) === 'mon-thu');
    else if (eventFilter === 'weekend')
      list = list.filter((event) => getThisWeekSegment(event) === 'weekend');
    else if (eventFilter === 'online') list = list.filter((event) => event.isOnline);

    if (eventCityFilter.trim()) {
      list = list.filter((event) => eventMatchesLocationFilter(event, eventCityFilter));
    }
    return list;
  }, [eventFilter, eventsList, eventCityFilter]);

  /** Distinct venue strings from published events (same source as Ad Manager). */
  const locationOptionsFromEvents = useMemo(() => {
    const byKey = new Map<string, string>();
    for (const ev of eventsList) {
      const t = ev.location.trim();
      if (!t) continue;
      const k = t.toLowerCase();
      if (!byKey.has(k)) byKey.set(k, t);
    }
    return [...byKey.values()].sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base' }),
    );
  }, [eventsList]);

  const savedLocationNotInList =
    eventCityFilter.trim().length > 0 &&
    !locationOptionsFromEvents.some(
      (l) => l.toLowerCase() === eventCityFilter.trim().toLowerCase(),
    );

  const effectiveEventsCountry = eventsListenerCountry ?? listenerGeo.country;

  const currentScheduleSlot = useMemo(
    () => schedule.find((slot) => slot.current),
    [schedule],
  );

  // Optimized helper functions with useCallback
  const shareCurrentSong = useCallback(() => {
    alert(shareMessage);
  }, [shareMessage]);

  // Optimized UI handlers

  // Load schedule from external source (API, JSON file, or local storage)
  const loadSchedule = useCallback(async () => {
    try {
      const response = await fetch(getScheduleUrl());
      if (response.ok) {
        const payload = await response.json() as { items?: ScheduleShow[] };
        if (Array.isArray(payload.items) && payload.items.length > 0) {
          setSchedule(payload.items);
          console.log('📅 Schedule loaded from ad server');
          return;
        }
      }

      // Fallback for offline/dev mode
      const savedSchedule = localStorage.getItem(STORAGE_KEYS.SCHEDULE);
      if (savedSchedule) {
        const parsedSchedule: ScheduleShow[] = JSON.parse(savedSchedule);
        setSchedule(parsedSchedule);
        console.log('📅 Schedule fallback loaded from localStorage');
        return;
      }

      console.log('📅 Schedule fallback using defaults');
    } catch (error) {
      console.error('❌ Failed to load schedule:', error);
    }
  }, []);

  const loadEvents = useCallback(async () => {
    const geoCountry = listenerGeo.country;
    try {
      const response = await fetch(getEventsUrl());
      if (response.ok) {
        const payload = await response.json() as {
          items?: EventApiRow[];
          listener_country?: string | null;
        };
        if (Array.isArray(payload.items)) {
          const mapped = payload.items.map(mapEventFromApi);
          setEventsListenerCountry(payload.listener_country ?? geoCountry ?? null);
          setEventsList(mapped);
          try {
            localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(mapped));
          } catch {
            /* ignore */
          }
          console.log('📆 Events loaded from ad server');
          return;
        }
      }

      const saved = localStorage.getItem(STORAGE_KEYS.EVENTS);
      if (saved) {
        const parsed = JSON.parse(saved) as StationEvent[];
        if (Array.isArray(parsed)) {
          setEventsListenerCountry(geoCountry ?? null);
          setEventsList(filterEventsForCountry(parsed, geoCountry));
          console.log('📆 Events fallback loaded from localStorage');
          return;
        }
      }

      setEventsListenerCountry(geoCountry ?? null);
      setEventsList(filterEventsForCountry([...DEFAULT_EVENTS], geoCountry));
      console.log('📆 Events fallback using defaults');
    } catch (error) {
      console.error('❌ Failed to load events:', error);
      try {
        const saved = localStorage.getItem(STORAGE_KEYS.EVENTS);
        if (saved) {
          const parsed = JSON.parse(saved) as StationEvent[];
          if (Array.isArray(parsed)) {
            setEventsListenerCountry(geoCountry ?? null);
            setEventsList(filterEventsForCountry(parsed, geoCountry));
            return;
          }
        }
      } catch {
        /* ignore */
      }
      setEventsListenerCountry(geoCountry ?? null);
      setEventsList(filterEventsForCountry([...DEFAULT_EVENTS], geoCountry));
    }
  }, [listenerGeo.country]);

  useEffect(() => {
    try {
      if (reduceMotion) {
        localStorage.setItem(STORAGE_KEYS.REDUCE_MOTION, '1');
      } else {
        localStorage.removeItem(STORAGE_KEYS.REDUCE_MOTION);
      }
    } catch {
      /* ignore quota / private mode */
    }
  }, [reduceMotion]);

  const clearScheduleCache = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEYS.SCHEDULE);
    } catch {
      /* ignore */
    }
    void loadSchedule();
  }, [loadSchedule]);

  // Mark current show based on time
  const updateCurrentShow = useCallback(() => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;

    const newSchedule = schedule.map(show => {
      const [startTime, endTime] = show.time.split(' - ');
      const startMinutes = parseTime(startTime);
      const endMinutes = parseTime(endTime);
      
      const isCurrent = (startMinutes <= currentTime && currentTime < endMinutes) ||
                       (startMinutes > endMinutes && (currentTime >= startMinutes || currentTime < endMinutes));
      
      return { ...show, current: isCurrent };
    });

    if (JSON.stringify(newSchedule) !== JSON.stringify(schedule)) {
      setSchedule(newSchedule);
    }
  }, [schedule]);

  // Helper function to parse time string to minutes - memoized for performance
  const parseTime = useCallback((timeStr: string): number => {
    const [time, period] = timeStr.split(' ');
    const [hours, minutes] = time.split(':').map(Number);
    let totalMinutes = hours * 60 + minutes;
    
    if (period === 'PM' && hours !== 12) totalMinutes += 12 * 60;
    if (period === 'AM' && hours === 12) totalMinutes = minutes;
    
    return totalMinutes;
  }, []); // No dependencies needed as it's a pure function

  // Load schedule on component mount
  useEffect(() => {
    // Load schedule and update display
    loadSchedule().then(() => {
      // After loading, update the main display
      const currentShowData = schedule.find(show => show.current);
      if (currentShowData) {
        setCurrentShow(currentShowData.show);
        setCurrentDJ(currentShowData.dj);
      }
    });
    void loadEvents();
  }, []);

  // Reload events when IP country is detected (server filters by country)
  useEffect(() => {
    if (!listenerGeo.loading) {
      void loadEvents();
    }
  }, [listenerGeo.country, listenerGeo.loading, loadEvents]);

  // Update current show every minute and sync with main display
  useEffect(() => {
    updateCurrentShow();
    
    // Update main display with current show info
    const currentShowData = schedule.find(show => show.current);
    if (currentShowData) {
      setCurrentShow(currentShowData.show);
      setCurrentDJ(currentShowData.dj);
    }
    
    const interval = setInterval(() => {
      updateCurrentShow();
      // Also update main display in the interval
      const currentShowData = schedule.find(show => show.current);
      if (currentShowData) {
        setCurrentShow(currentShowData.show);
        setCurrentDJ(currentShowData.dj);
      }
    }, RADIO_CONFIG.SCHEDULE_UPDATE_INTERVAL);
    
    return () => clearInterval(interval);
  }, [schedule]);

  // Update current song for liked songs tracking
  useEffect(() => {
    updateCurrentSong(currentSong);
  }, [currentSong, updateCurrentSong]);

  // Stop tracking playtime when song changes or component unmounts
  useEffect(() => {
    return () => {
      stopTrackingPlaytime();
    };
  }, [currentSong, stopTrackingPlaytime]);

  // Dynamic theme integration - update theme when cover art changes
  useEffect(() => {
    if (currentSong.coverArt && currentSong.coverArt !== '') {
      updateThemeFromCoverArt(currentSong.coverArt);
    }
  }, [currentSong.coverArt, updateThemeFromCoverArt]);

  // Notification integration - notify on song changes
  useEffect(() => {
    if (currentSong.title && currentSong.title !== 'Loading...' && isPlaying) {
      // Send now playing notification
      notifyNowPlaying(currentSong);
      
      // Check for favorite artist notification
      notifyFavoriteArtist(currentSong);
    }
  }, [currentSong, isPlaying, notifyNowPlaying, notifyFavoriteArtist]);

  // Listener milestone notifications
  useEffect(() => {
    if (typeof listeners === 'number' && listeners > 0) {
      notifyListenerMilestone(listeners);
    }
  }, [listeners, notifyListenerMilestone]);

  useEffect(() => {
    if (!showEvents) setEventImageLightbox(null);
  }, [showEvents]);

  useEffect(() => {
    if (!eventImageLightbox) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setEventImageLightbox(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [eventImageLightbox]);


  return (
    <ErrorBoundary>
    <>
      {/* PWA Install Prompt and Status */}
      <PWAPrompt
        isInstallable={isInstallable}
        isOffline={isOffline}
        updateAvailable={updateAvailable}
        onInstall={installApp}
        onUpdate={updateServiceWorker}
      />
      
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white" data-testid="app-loaded">
      {/* Hidden Audio Element */}
      <audio 
        ref={audioRef} 
        preload="none" 
        style={{display: 'none'}}
      />
      
      {/* Advertisement Banner - Top of Screen */}
      <div className="container mx-auto px-4 pt-4" style={{ minHeight: 90 }}>
        <AdBanner
          className="max-w-4xl mx-auto"
          placement={AD_PLACEMENTS.BANNER_TOP}
          country={listenerGeo.country ?? undefined}
          city={listenerGeo.city ?? undefined}
          state={listenerGeo.state ?? undefined}
        />
      </div>
      
            {/* Header */}
      <div className="bg-black/20 backdrop-blur-sm border-b border-white/10 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center">
              <Radio className="w-6 h-6" />
            </div>
      <div>
            <h1 className="font-bold text-lg">{RADIO_CONFIG.STATION_NAME}</h1>
            <p className="text-sm text-gray-300">{RADIO_CONFIG.TAGLINE}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {isConnected ? (
              <Signal className="w-5 h-5 text-green-400" />
            ) : (
              <Signal className="w-5 h-5 text-red-400" />
            )}
            <div className="text-right">
              <p className="text-xs text-gray-300">LIVE</p>
              <p className="text-xs text-gray-300" data-testid="listeners">
                {listeners === null ? '— listeners' : `${listeners.toLocaleString()} listeners`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {/* Current Show Info */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-6">
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-16 h-16 bg-gradient-to-r from-pink-400 to-purple-500 rounded-full flex items-center justify-center">
              <span className="text-2xl font-bold">SM</span>
              </div>
            <div>
              <h2 className="text-xl font-bold">{currentShow}</h2>
              <p className="text-gray-300">with {currentDJ}</p>
              <p className="text-sm text-gray-400">
                {currentScheduleSlot?.time ?? '—'}
              </p>
            </div>
              </div>
            </div>

        {/* Player Controls — above Now Playing */}
        <PlayerControls
          isPlaying={isPlaying}
          isLoading={isLoading}
          volume={volume}
          isMuted={isMuted}
          isLiked={isLiked}
          onTogglePlayPause={togglePlayPause}
          onVolumeChange={handleVolumeChange}
          onToggleMute={toggleMute}
          onToggleLike={toggleLike}
        />

        {/* Audio Visualizer */}
        <div className="mb-6 relative" style={{ position: 'relative', zIndex: 1 }}>
          <AudioVisualizer
            isPlaying={isPlaying}
            audioElement={audioRef.current}
            reducedMotion={reduceMotion}
            className="h-24 bg-gradient-to-r from-purple-900/20 to-pink-900/20 backdrop-blur-sm"
            style={{ position: 'relative', zIndex: 1 }}
          />
          </div>

        {/* Now Playing */}
        <NowPlaying
          currentSong={currentSong}
          nextSong={nextSong}
          isLoadingMetadata={isLoadingMetadata}
          onRefreshMetadata={fetchMetadata}
          onRefreshArtwork={refreshCurrentArtwork}
          onShareCurrentSong={shareCurrentSong}
          getGradientClass={getGradientClass}
          isLiked={isLiked}
          onToggleLike={toggleLike}
        />


        {/* Quick Actions */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
          <div className="grid grid-cols-3 gap-4">
            <button
              type="button"
              onClick={() => setShowSchedule(true)}
              className="bg-white/20 hover:bg-white/30 rounded-xl p-4 flex flex-col items-center space-y-2 transition-all"
            >
              <Calendar className="w-6 h-6" />
              <span className="text-sm">View Schedule</span>
            </button>
            
            <button
              type="button"
              onClick={() => setShowEvents(true)}
              className="bg-white/20 hover:bg-white/30 rounded-xl p-4 flex flex-col items-center space-y-2 transition-all"
            >
              <Users className="w-6 h-6" />
              <span className="text-sm">Events</span>
            </button>
            
            <button
              type="button"
              onClick={() => setShowSettings(true)}
              className="bg-white/20 hover:bg-white/30 rounded-xl p-4 flex flex-col items-center space-y-2 transition-all"
            >
              <Settings className="w-6 h-6" />
              <span className="text-sm">Settings</span>
            </button>
          </div>
        </div>
      </div>

      {/* Schedule Modal */}
      {showSchedule && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">📻 New Stars Radio Schedule</h3>
              <button 
                onClick={() => setShowSchedule(false)}
                className="text-gray-400 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              {schedule.map((slot, index) => (
                <div 
                  key={index} 
                  className={`rounded-lg p-4 ${slot.current ? 'bg-gradient-to-r from-pink-600/20 to-purple-600/20 border border-pink-500/30' : 'bg-white/10'}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-bold text-lg">{slot.show}</h4>
                        {slot.current && (
                          <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full animate-pulse">
                            ON AIR
                          </span>
                        )}
                      </div>
                      <p className="text-pink-300 font-semibold text-sm">with {slot.dj}</p>
                      <p className="text-gray-300 text-sm mt-1">{slot.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-400 text-sm font-mono">{slot.time}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-6 bg-white/5 rounded-lg p-4">
              <p className="text-sm text-gray-300 text-center">
                🎵 All times are local. Schedule subject to change for special events and breaking news.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Events Modal */}
      {showEvents && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto border border-white/10">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Users className="w-6 h-6" />
                Station Events
              </h3>
              <button
                type="button"
                onClick={() => setShowEvents(false)}
                className="text-gray-400 hover:text-white text-xl leading-none"
                aria-label="Close events"
              >
                ✕
              </button>
            </div>

            <div className="mb-5 rounded-xl border border-white/10 bg-white/5 p-4">
              <label className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm text-gray-200 flex items-center gap-2 shrink-0">
                  <MapPin className="w-4 h-4 text-pink-400" aria-hidden />
                  Show events in
                </span>
                <select
                  value={eventCityFilter}
                  onChange={(e) => {
                    const v = e.target.value;
                    setEventCityFilter(v);
                    writeEventCityFilter(v);
                  }}
                  aria-label="Filter events by venue location"
                  style={{ colorScheme: 'light' }}
                  className="w-full sm:max-w-xs rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500/60"
                >
                  <option value="">All areas</option>
                  {savedLocationNotInList ? (
                    <option value={eventCityFilter}>{eventCityFilter}</option>
                  ) : null}
                  {locationOptionsFromEvents.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </label>
              {locationOptionsFromEvents.length === 0 ? (
                <p className="mt-2 text-xs text-gray-500">
                  No venue lines yet on published events. Use <strong className="text-gray-400">All areas</strong>{' '}
                  to browse, or add events in Ad Manager with a location set.
                </p>
              ) : (
                <p className="mt-2 text-xs text-gray-500">
                  Each option is a distinct location from your events. Pick one to show only events at that
                  venue.
                </p>
              )}
              <p className="mt-2 text-xs text-gray-500">
                {effectiveEventsCountry ? (
                  <>
                    Showing events for your area (<strong className="text-gray-400">{effectiveEventsCountry}</strong>
                    ) based on your connection. Worldwide events with no country set still appear everywhere.
                  </>
                ) : listenerGeo.loading ? (
                  'Detecting your country for event filtering…'
                ) : (
                  'Country could not be detected — only worldwide events (no country set in Ad Manager) are listed.'
                )}
              </p>
            </div>

            <AdBanner
              className="mb-5 max-w-full"
              placement={AD_PLACEMENTS.EVENTS_MODAL}
              compact
              hideWhenEmpty
              country={listenerGeo.country ?? undefined}
              city={listenerGeo.city ?? undefined}
              state={listenerGeo.state ?? undefined}
            />

            <div className="flex flex-wrap gap-2 mb-5">
              <button
                type="button"
                onClick={() => setEventFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-sm ${eventFilter === 'all' ? 'bg-pink-600 text-white' : 'bg-white/10 hover:bg-white/20'}`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setEventFilter('mon-thu')}
                className={`px-3 py-1.5 rounded-lg text-sm ${eventFilter === 'mon-thu' ? 'bg-pink-600 text-white' : 'bg-white/10 hover:bg-white/20'}`}
              >
                Mon–Thu
              </button>
              <button
                type="button"
                onClick={() => setEventFilter('weekend')}
                className={`px-3 py-1.5 rounded-lg text-sm ${eventFilter === 'weekend' ? 'bg-pink-600 text-white' : 'bg-white/10 hover:bg-white/20'}`}
              >
                Weekend
              </button>
              <button
                type="button"
                onClick={() => setEventFilter('online')}
                className={`px-3 py-1.5 rounded-lg text-sm ${eventFilter === 'online' ? 'bg-pink-600 text-white' : 'bg-white/10 hover:bg-white/20'}`}
              >
                Online
              </button>
            </div>

            <p className="text-xs text-gray-500 mb-1">
              Mon–Thu and Weekend filter by each event&apos;s start time within this calendar week (Mon–Sun,
              local). Location filter matches the venue line on each event (pick a listed venue or keep a saved
              filter).
            </p>
            <p className="text-xs text-gray-500 mb-3">
              Event times reflect your local timezone.
            </p>

            <div className="space-y-4">
              {filteredEvents.length === 0 ? (
                <p className="text-center text-gray-400 py-10 text-sm px-2">
                  {eventCityFilter.trim()
                    ? 'No events match this venue with the filters you chose. Try All areas, another location, or a different time filter.'
                    : 'No events to show right now.'}
                </p>
              ) : (
              filteredEvents.map((event) => {
                const eventImageSrc = resolveStationEventImageUrl(event.imageUrl);
                return (
                <article key={event.id} className="bg-white/5 rounded-xl p-4 border border-white/10">
                  {eventImageSrc ? (
                    <button
                      type="button"
                      onClick={() => setEventImageLightbox({ src: eventImageSrc, alt: event.title })}
                      className="group mb-3 w-full rounded-lg border border-white/10 bg-black/20 p-2 text-left cursor-zoom-in transition-opacity hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                      aria-label={`View ${event.title} poster full screen`}
                      title="Tap to view full screen"
                    >
                      <img
                        src={eventImageSrc}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="w-full max-w-sm mx-auto aspect-[2/3] object-contain rounded-md pointer-events-none"
                      />
                    </button>
                  ) : null}
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div>
                      <h4 className="font-semibold text-lg">{event.title}</h4>
                      <p className="text-sm text-gray-400">{event.dateLabel}</p>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        event.status === 'live'
                          ? 'bg-red-500/90 text-white animate-pulse'
                          : event.status === 'upcoming'
                            ? 'bg-emerald-500/80 text-white'
                            : 'bg-gray-600 text-gray-200'
                      }`}
                    >
                      {event.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm text-pink-300 mb-2">{event.location}</p>
                  <p className="text-sm text-gray-300">{event.description}</p>
                  <div className="mt-3 flex flex-wrap gap-2 items-center">
                    {(() => {
                      const range = getEventTimeRange(event);
                      if (!range) {
                        return (
                          <p className="text-xs text-gray-500">
                            Set start time in Ad Manager to open this event in Google Calendar or download a
                            calendar file (.ics).
                          </p>
                        );
                      }
                      const gcalUrl = buildGoogleCalendarUrl(event, range.start, range.end);
                      const icsBody = buildIcsContent(event, range.start, range.end);
                      const icsName = `new-stars-radio-event-${event.id}.ics`;
                      return (
                        <>
                          <a
                            href={gcalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm bg-white/10 hover:bg-white/20 text-white transition-colors"
                          >
                            <ExternalLink className="w-4 h-4 shrink-0" aria-hidden />
                            Google Calendar
                          </a>
                          <button
                            type="button"
                            onClick={() => downloadIcsFile(icsName, icsBody)}
                            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm bg-white/10 hover:bg-white/20 text-white transition-colors"
                          >
                            <Download className="w-4 h-4 shrink-0" aria-hidden />
                            Download .ics
                          </button>
                        </>
                      );
                    })()}
                  </div>
                </article>
                );
              })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto border border-white/10">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Settings className="w-6 h-6" />
                Settings
              </h3>
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="text-gray-400 hover:text-white text-xl leading-none"
                aria-label="Close settings"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              <section className="bg-white/5 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-pink-300 mb-2">About</h4>
                <p className="text-lg font-bold">{RADIO_CONFIG.STATION_NAME}</p>
                <p className="text-sm text-gray-300 mt-1">{RADIO_CONFIG.TAGLINE}</p>
                <p className="text-gray-400 text-sm mt-2">
                  New Stars Radio is your #1 stop for up and coming artists in Hip-Hop, R&apos;n&apos;B and Smooth Jazz. We are committed to finding great unknown artists and bringing them to your eardrums.
                </p>
              </section>

              <section className="bg-white/5 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-pink-300 mb-3 flex items-center gap-2">
                  <Volume2 className="w-4 h-4" />
                  Volume
                </h4>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={volume}
                  onChange={handleVolumeChange}
                  className="w-full accent-pink-500"
                />
                <p className="text-xs text-gray-500 mt-2">Same level as the player above. Saved for this session.</p>
              </section>

              <section className="bg-white/5 rounded-xl p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={reduceMotion}
                    onChange={(e) => setReduceMotion(e.target.checked)}
                    className="mt-1 rounded border-white/20 bg-white/10 text-pink-500 focus:ring-pink-500"
                  />
                  <span>
                    <span className="font-medium block">Reduce visualizer motion</span>
                    <span className="text-sm text-gray-400">Shows a static bar display instead of animated waves while you listen.</span>
                  </span>
                </label>
              </section>

              <section className="bg-white/5 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-pink-300 mb-2">Cached schedule</h4>
                <p className="text-xs text-gray-400 mb-3">
                  If the timetable looks wrong after an update, clear the saved copy and reload from the server.
                </p>
                <button
                  type="button"
                  onClick={clearScheduleCache}
                  className="flex items-center gap-2 bg-white/10 hover:bg-white/20 rounded-lg px-3 py-2 text-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear schedule cache
                </button>
              </section>

              <section className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-amber-200 mb-2">Playback</h4>
                <p className="text-sm text-gray-300">
                  Some browsers block sound until you press play. If you do not hear audio, tap the main play button once.
                </p>
              </section>
            </div>
          </div>
        </div>
      )}

      {/* Bottom advertisement */}
      <div className={`container mx-auto px-4 pb-4 ${isPlaying ? 'mb-16' : ''}`}>
        <AdBanner
          className="max-w-4xl mx-auto"
          placement={AD_PLACEMENTS.BANNER_BOTTOM}
          country={listenerGeo.country ?? undefined}
          city={listenerGeo.city ?? undefined}
          state={listenerGeo.state ?? undefined}
        />
      </div>

      {/* Status Bar */}
      {isPlaying && (
        <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-pink-600 to-purple-600 p-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white/20 rounded flex items-center justify-center">
                <Radio className="w-4 h-4" />
    </div>
              <div>
                <p className="text-sm font-semibold">{RADIO_CONFIG.STATION_NAME} - LIVE</p>
                <p className="text-xs opacity-80">{currentSong.title} - {currentSong.artist}</p>
              </div>
            </div>
            <button onClick={togglePlayPause} className="p-2">
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
            </button>
          </div>
        </div>
      )}
    </div>

      {eventImageLightbox ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 p-4 sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label="Full screen event image"
          onClick={() => setEventImageLightbox(null)}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setEventImageLightbox(null);
            }}
            className="absolute top-4 right-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-xl text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-pink-500"
            aria-label="Close full screen image"
          >
            ✕
          </button>
          <img
            src={eventImageLightbox.src}
            alt={eventImageLightbox.alt}
            className="max-h-[100dvh] max-w-full object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}
    </>
    </ErrorBoundary>
  );
};

export default RadioStreamingApp;
