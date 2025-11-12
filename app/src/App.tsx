import { useState, useEffect, useMemo, useCallback } from 'react';
import { MessageCircle, Calendar, Users, Radio, Signal, Settings, Edit3, Play, Pause, Star } from 'lucide-react';
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
import type { ScheduleShow, Post } from './types';

import { RADIO_CONFIG, DEFAULT_SCHEDULE, STORAGE_KEYS } from './constants';

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
    isSupported: notificationsSupported,
    permission: notificationPermission,
    requestPermission,
    notifyNowPlaying,
    notifyFavoriteArtist,
    notifyListenerMilestone,
    toggleFavoriteArtist,
    isFavoriteArtist
  } = useNotifications();

  // UI state
  const [currentShow, setCurrentShow] = useState('Morning Drive');
  const [currentDJ, setCurrentDJ] = useState('Sarah Martinez');
  const [showPostModal, setShowPostModal] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [showSchedule, setShowSchedule] = useState(false);
  const [showScheduleEditor, setShowScheduleEditor] = useState(false);
  const [schedule, setSchedule] = useState<ScheduleShow[]>([...DEFAULT_SCHEDULE]);
  const [editingShow, setEditingShow] = useState<ScheduleShow | null>(null);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);
  const [recentPosts, setRecentPosts] = useState<Post[]>([
    { id: 1, content: "🎵 Coming up next: Taylor Swift's latest hit! What's your favorite Taylor song?", time: "2 hours ago", likes: 47 },
    { id: 2, content: "Beautiful morning here in the studio! ☀️ Perfect weather for some feel-good music.", time: "4 hours ago", likes: 23 }
  ]);

  // UI helper functions - memoized for performance
  const textStation = useCallback(() => {
    // Simulate text integration
    alert('Text NEWSTARS to request a song!');
  }, []);

  // Memoized expensive computations
  const shareMessage = useMemo(() => {
    return `🎵 Currently listening to "${currentSong.title}" by ${currentSong.artist} on ${RADIO_CONFIG.STATION_NAME}! 📻`;
  }, [currentSong.title, currentSong.artist]);

  // Optimized helper functions with useCallback
  const shareCurrentSong = useCallback(() => {
    alert(shareMessage);
  }, [shareMessage]);

  const createPost = useCallback(() => {
    if (postContent.trim()) {
      const newPost: Post = {
        id: recentPosts.length + 1,
        content: postContent,
        time: "Just now",
        likes: 0
      };
      setRecentPosts([newPost, ...recentPosts]);
      setPostContent('');
      setShowPostModal(false);
    }
  }, [postContent, recentPosts]);

  // Optimized UI handlers

  // Load schedule from external source (API, JSON file, or local storage)
  const loadSchedule = useCallback(async () => {
    setIsLoadingSchedule(true);
    try {
      // Option 1: Load from localStorage (for persistence)
      const savedSchedule = localStorage.getItem(STORAGE_KEYS.SCHEDULE);
      if (savedSchedule) {
        const parsedSchedule: ScheduleShow[] = JSON.parse(savedSchedule);
        setSchedule(parsedSchedule);
        console.log('📅 Schedule loaded from localStorage');
        return;
      }

      // Option 2: Load from external API (replace with your actual API)
      // const response = await fetch('https://your-api.com/schedule');
      // const scheduleData = await response.json();
      // setSchedule(scheduleData);

      // Option 3: Load from JSON file in public folder
      // const response = await fetch('/schedule.json');
      // const scheduleData = await response.json();
      // setSchedule(scheduleData);

      console.log('📅 Using default schedule');
    } catch (error) {
      console.error('❌ Failed to load schedule:', error);
    } finally {
      setIsLoadingSchedule(false);
    }
  }, []); // No dependencies needed as it doesn't depend on state

  // Save schedule to localStorage and optionally sync to external API
  const saveSchedule = useCallback(async (newSchedule: ScheduleShow[]) => {
    try {
      // Save locally
      localStorage.setItem(STORAGE_KEYS.SCHEDULE, JSON.stringify(newSchedule));
      setSchedule(newSchedule);
      
      // Immediately update main display with current show
      const currentShowData = newSchedule.find(show => show.current);
      if (currentShowData) {
        setCurrentShow(currentShowData.show);
        setCurrentDJ(currentShowData.dj);
      }
      
      // Option: Sync to external API
      // await fetch('https://your-api.com/schedule', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(newSchedule)
      // });

      console.log('📅 Schedule saved successfully and display updated');
        } catch (error) {
      console.error('❌ Failed to save schedule:', error);
    }
  }, []); // No dependencies needed

  // Update a specific show in the schedule
  const updateShow = useCallback((showId: number, updatedShow: Partial<ScheduleShow>) => {
    const newSchedule = schedule.map(show => 
      show.id === showId ? { ...show, ...updatedShow } : show
    );
    saveSchedule(newSchedule);
  }, [schedule, saveSchedule]);

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
    if (listeners > 0) {
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
      <div className="container mx-auto px-4 pt-4">
        <AdBanner 
          className="max-w-4xl mx-auto"
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
              <p className="text-xs text-gray-300" data-testid="listeners">{listeners.toLocaleString()} listeners</p>
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

        {/* Audio Visualizer */}
        <div className="mb-6 relative" style={{ position: 'relative', zIndex: 1 }}>
          <AudioVisualizer
            isPlaying={isPlaying}
            audioElement={audioRef.current}
            className="h-24 bg-gradient-to-r from-purple-900/20 to-pink-900/20 backdrop-blur-sm"
            style={{ position: 'relative', zIndex: 1 }}
          />
          </div>

        {/* Player Controls */}
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


        {/* Social Media Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">Community</h3>
              <button
              onClick={() => setShowPostModal(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded-lg text-sm transition-all"
            >
              Post
              </button>
          </div>
          
          {/* Recent Posts */}
          <div className="space-y-4">
            {recentPosts.map(post => (
              <div key={post.id} className="bg-white/10 backdrop-blur-md rounded-xl p-4">
                <p className="text-white text-sm mb-2">{post.content}</p>
                <div className="flex items-center justify-between text-gray-300 text-xs">
                  <span>{post.time}</span>
                  <span>{post.likes} likes</span>
                  </div>
              </div>
            ))}
            </div>

          {/* Post Modal */}
          {showPostModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-gray-900 rounded-xl p-6 w-full max-w-md">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white">Share with Community</h3>
                  <button
                    onClick={() => setShowPostModal(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    ×
            </button>
          </div>
                <textarea
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  placeholder="What's on your mind about the music?"
                  className="w-full bg-white/10 text-white placeholder-gray-400 rounded-lg p-3 mb-4 resize-none"
                  rows={3}
                />
                <button
                  onClick={createPost}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 rounded-lg transition-all"
                >
                  Post
                </button>
                  </div>
                </div>
          )}
                </div>

        {/* Enhanced Features */}
        <div className="mb-6 space-y-4">
          {/* Notification Controls */}
          {notificationsSupported && (
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-semibold">🔔 Notifications</h3>
                {notificationPermission === 'granted' && (
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          )}
        </div>

              {notificationPermission === 'default' && (
            <button
                  onClick={requestPermission}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-all mb-2"
            >
                  Enable Push Notifications
            </button>
              )}
              
              {notificationPermission === 'granted' && (
                <div className="text-sm text-gray-300">
                  ✅ You'll get notified about new songs and favorite artists
          </div>
              )}
              
              {notificationPermission === 'denied' && (
                <div className="text-sm text-red-300">
                  ❌ Notifications blocked. Enable in browser settings.
            </div>
              )}
          </div>
          )}

          {/* Favorite Artist */}
          {currentSong.artist && currentSong.artist !== 'New Stars Radio' && (
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h4 className="text-white font-medium">{currentSong.artist}</h4>
                  <p className="text-gray-300 text-sm">
                    {isFavoriteArtist(currentSong.artist) ? 'Favorite Artist ⭐' : 'Add to favorites?'}
                  </p>
                </div>
            <button 
                  onClick={() => toggleFavoriteArtist(currentSong.artist)}
                  className={`p-2 rounded-lg transition-all ${
                    isFavoriteArtist(currentSong.artist)
                      ? 'bg-yellow-500 text-white' 
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  }`}
                  title={isFavoriteArtist(currentSong.artist) ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <Star className={`w-5 h-5 ${isFavoriteArtist(currentSong.artist) ? 'fill-current' : ''}`} />
            </button>
          </div>
                  </div>
          )}
        </div>

        {/* Community Features */}
        <div className="mb-6">
          <button
            onClick={textStation}
            className="w-full bg-blue-600 hover:bg-blue-700 rounded-xl p-4 flex items-center justify-center space-x-2 transition-all"
          >
            <MessageCircle className="w-5 h-5" />
            <span className="font-semibold">Text Song Request</span>
          </button>
        </div>

        {/* Quick Actions */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
          <div className="grid grid-cols-4 gap-4">
            <button 
              onClick={() => setShowSchedule(true)}
              className="bg-white/20 hover:bg-white/30 rounded-xl p-4 flex flex-col items-center space-y-2 transition-all"
            >
              <Calendar className="w-6 h-6" />
              <span className="text-sm">View Schedule</span>
            </button>
            
            <button 
              onClick={() => setShowScheduleEditor(true)}
              className="bg-white/20 hover:bg-white/30 rounded-xl p-4 flex flex-col items-center space-y-2 transition-all"
            >
              <Edit3 className="w-6 h-6" />
              <span className="text-sm">Edit Schedule</span>
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


      {/* Schedule Editor Modal */}
      {showScheduleEditor && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">📝 Edit Schedule - New Stars Radio</h3>
              <div className="flex items-center space-x-3">
              <button 
                  onClick={loadSchedule}
                  disabled={isLoadingSchedule}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-all disabled:opacity-50 flex items-center space-x-2"
                >
                  <span>🔄</span>
                  <span className="text-sm">Reload</span>
                </button>
                <button 
                  onClick={() => setShowScheduleEditor(false)}
                  className="text-gray-400 hover:text-white text-xl"
              >
                ✕
              </button>
              </div>
            </div>
            
            <div className="space-y-4">
              {schedule.map((show) => (
                <div 
                  key={show.id} 
                  className={`${show.current ? 'bg-gradient-to-r from-pink-600/20 to-purple-600/20 border border-pink-500/30' : 'bg-white/10'} rounded-lg p-4`}
                >
                  {editingShow?.id === show.id ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <input
                          type="text"
                          value={editingShow.time}
                          onChange={(e) => setEditingShow({...editingShow, time: e.target.value})}
                          className="bg-white/10 rounded-lg p-2 text-white placeholder-gray-400"
                          placeholder="Time (e.g., 6:00 AM - 10:00 AM)"
                        />
                        <input
                          type="text"
                          value={editingShow.show}
                          onChange={(e) => setEditingShow({...editingShow, show: e.target.value})}
                          className="bg-white/10 rounded-lg p-2 text-white placeholder-gray-400"
                          placeholder="Show Name"
                        />
    </div>
                      <input
                        type="text"
                        value={editingShow.dj}
                        onChange={(e) => setEditingShow({...editingShow, dj: e.target.value})}
                        className="w-full bg-white/10 rounded-lg p-2 text-white placeholder-gray-400"
                        placeholder="DJ Name"
                      />
            <textarea
                        value={editingShow.description}
                        onChange={(e) => setEditingShow({...editingShow, description: e.target.value})}
                        className="w-full bg-white/10 rounded-lg p-2 text-white placeholder-gray-400 resize-none"
                        placeholder="Show Description"
                        rows={2}
                      />
              <div className="flex space-x-2">
                <button 
                          onClick={() => {
                            updateShow(show.id, editingShow);
                            setEditingShow(null);
                            // Force immediate display update
                            if (editingShow.current) {
                              setCurrentShow(editingShow.show);
                              setCurrentDJ(editingShow.dj);
                            }
                          }}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-all text-sm"
                        >
                          Save
                        </button>
                        <button 
                          onClick={() => setEditingShow(null)}
                          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-all text-sm"
                >
                  Cancel
                </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-bold text-lg">{show.show}</h4>
                          {show.current && (
                            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full animate-pulse">
                              ON AIR
                            </span>
                          )}
                        </div>
                        <p className="text-pink-300 font-semibold text-sm">with {show.dj}</p>
                        <p className="text-gray-300 text-sm mt-1">{show.description}</p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="text-right">
                          <p className="text-gray-400 text-sm font-mono">{show.time}</p>
                        </div>
                <button 
                          onClick={() => setEditingShow(show)}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded-lg transition-all text-sm"
                >
                          Edit
                </button>
              </div>
            </div>
                  )}
                </div>
              ))}
            </div>
            
            <div className="mt-6 bg-white/5 rounded-lg p-4">
              <p className="text-sm text-gray-300 text-center">
                📅 Changes are saved automatically to browser storage. Set up API sync for multi-device editing.
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
