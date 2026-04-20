import { useState, useEffect, useMemo, useCallback } from 'react';
import { Calendar, Users, Radio, Signal, Settings, Play, Pause } from 'lucide-react';
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
import { PWAPrompt } from './components/PWAPrompt';
import { AdBanner } from './components/AdBanner';
import type { ScheduleShow } from './types';

import { RADIO_CONFIG, DEFAULT_SCHEDULE, STORAGE_KEYS, getScheduleUrl } from './constants';

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

  // UI state
  const [currentShow, setCurrentShow] = useState('Morning Drive');
  const [currentDJ, setCurrentDJ] = useState('Sarah Martinez');
  const [showSchedule, setShowSchedule] = useState(false);
  const [schedule, setSchedule] = useState<ScheduleShow[]>([...DEFAULT_SCHEDULE]);

  // Memoized expensive computations
  const shareMessage = useMemo(() => {
    return `🎵 Currently listening to "${currentSong.title}" by ${currentSong.artist} on ${RADIO_CONFIG.STATION_NAME}! 📻`;
  }, [currentSong.title, currentSong.artist]);

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
  }, []);

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
          country="NA"  // Namibia - change or detect dynamically for other countries
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
              <p className="text-sm text-gray-400">6:00 AM - 10:00 AM</p>
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
              onClick={() => setShowSchedule(true)}
              className="bg-white/20 hover:bg-white/30 rounded-xl p-4 flex flex-col items-center space-y-2 transition-all"
            >
              <Calendar className="w-6 h-6" />
              <span className="text-sm">View Schedule</span>
            </button>
            
            <button className="bg-white/20 hover:bg-white/30 rounded-xl p-4 flex flex-col items-center space-y-2 transition-all">
              <Users className="w-6 h-6" />
              <span className="text-sm">Events</span>
            </button>
            
            <button className="bg-white/20 hover:bg-white/30 rounded-xl p-4 flex flex-col items-center space-y-2 transition-all">
              <Settings className="w-6 h-6" />
              <span className="text-sm">Settings</span>
        </button>
          </div>
        </div>
      </div>

      {/* Schedule Modal */}
      {showSchedule && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
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
    </>
    </ErrorBoundary>
  );
};

export default RadioStreamingApp;
