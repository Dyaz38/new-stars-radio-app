import { useState, useEffect, useCallback } from 'react';
import type { Song } from '../types';
import { RADIO_CONFIG } from '../constants';

interface NotificationPreferences {
  nowPlaying: boolean;
  favoriteArtists: boolean;
  showReminders: boolean;
  listenerMilestones: boolean;
}

interface FavoriteArtist {
  name: string;
  addedAt: string;
}

export const useNotifications = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    nowPlaying: true,
    favoriteArtists: true,
    showReminders: true,
    listenerMilestones: true
  });
  const [favoriteArtists, setFavoriteArtists] = useState<FavoriteArtist[]>([]);
  const [lastNotifiedSong, setLastNotifiedSong] = useState<string>('');

  // Check notification support
  useEffect(() => {
    const supported = 'Notification' in window && 'serviceWorker' in navigator;
    setIsSupported(supported);
    
    if (supported) {
      setPermission(Notification.permission);
    }

    // Load preferences from localStorage
    const savedPrefs = localStorage.getItem('newstarsradio-notification-preferences');
    if (savedPrefs) {
      try {
        setPreferences(JSON.parse(savedPrefs));
      } catch (error) {
        console.warn('Failed to load notification preferences:', error);
      }
    }

    // Load favorite artists
    const savedArtists = localStorage.getItem('newstarsradio-favorite-artists');
    if (savedArtists) {
      try {
        setFavoriteArtists(JSON.parse(savedArtists));
      } catch (error) {
        console.warn('Failed to load favorite artists:', error);
      }
    }
  }, []);

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      console.warn('Notifications not supported');
      return false;
    }

    if (permission === 'granted') {
      return true;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        console.log('🔔 Notification permission granted');
        
        // Register service worker for background notifications
        if ('serviceWorker' in navigator) {
          try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('Service Worker registered for notifications:', registration);
          } catch (error) {
            console.warn('Service Worker registration failed:', error);
          }
        }
        
        return true;
      } else {
        console.log('🔕 Notification permission denied');
        return false;
      }
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return false;
    }
  }, [isSupported, permission]);

  // Send notification
  const sendNotification = useCallback(async (
    title: string, 
    options: {
      body?: string;
      icon?: string;
      tag?: string;
      actions?: { action: string; title: string; icon?: string }[];
      data?: any;
    } = {}
  ): Promise<boolean> => {
    if (!isSupported || permission !== 'granted') {
      return false;
    }

    try {
      const defaultOptions = {
        icon: '/vite.svg',
        badge: '/vite.svg',
        vibrate: [100, 50, 100],
        requireInteraction: false,
        silent: false,
        ...options
      };

      // Try to use service worker notification (works in background)
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(title, defaultOptions);
      } else {
        // Fallback to regular notification
        new Notification(title, defaultOptions);
      }

      console.log(`🔔 Notification sent: ${title}`);
      return true;
    } catch (error) {
      console.error('Failed to send notification:', error);
      return false;
    }
  }, [isSupported, permission]);

  // Send now playing notification
  const notifyNowPlaying = useCallback(async (song: Song): Promise<void> => {
    if (!preferences.nowPlaying || !song.title || song.title === 'Loading...') {
      return;
    }

    const songKey = `${song.artist}-${song.title}`;
    if (songKey === lastNotifiedSong) {
      return; // Don't spam the same song
    }

    const success = await sendNotification(
      `🎵 ${RADIO_CONFIG.STATION_NAME}`,
      {
        body: `♪ Now Playing: ${song.title} - ${song.artist}`,
        tag: 'now-playing',
        icon: song.coverArt && !song.coverArt.startsWith('gradient-') ? song.coverArt : '/vite.svg',
        actions: [
          { action: 'play', title: '▶️ Listen' },
          { action: 'like', title: '❤️ Like' }
        ],
        data: { 
          type: 'now-playing', 
          song,
          url: window.location.origin 
        }
      }
    );

    if (success) {
      setLastNotifiedSong(songKey);
    }
  }, [preferences.nowPlaying, lastNotifiedSong, sendNotification]);

  // Send favorite artist notification
  const notifyFavoriteArtist = useCallback(async (song: Song): Promise<void> => {
    if (!preferences.favoriteArtists || !song.artist) {
      return;
    }

    const isFavorite = favoriteArtists.some(
      fav => fav.name.toLowerCase() === song.artist.toLowerCase()
    );

    if (!isFavorite) {
      return;
    }

    await sendNotification(
      `⭐ Favorite Artist Alert!`,
      {
        body: `🎵 ${song.artist} is now playing: "${song.title}"`,
        tag: 'favorite-artist',
        icon: song.coverArt && !song.coverArt.startsWith('gradient-') ? song.coverArt : '/vite.svg',
        actions: [
          { action: 'play', title: '▶️ Listen Now' },
          { action: 'like', title: '❤️ Like Song' }
        ],
        data: { 
          type: 'favorite-artist', 
          song,
          url: window.location.origin 
        }
      }
    );
  }, [preferences.favoriteArtists, favoriteArtists, sendNotification]);

  // Send listener milestone notification
  const notifyListenerMilestone = useCallback(async (count: number): Promise<void> => {
    if (!preferences.listenerMilestones) {
      return;
    }

    // Only notify on significant milestones
    const milestones = [100, 250, 500, 1000, 2500, 5000];
    if (!milestones.includes(count)) {
      return;
    }

    await sendNotification(
      `🎉 ${RADIO_CONFIG.STATION_NAME}`,
      {
        body: `${count.toLocaleString()} people are listening right now!`,
        tag: 'listener-milestone',
        actions: [
          { action: 'play', title: '🎵 Join Them' }
        ],
        data: { 
          type: 'listener-milestone', 
          count,
          url: window.location.origin 
        }
      }
    );
  }, [preferences.listenerMilestones, sendNotification]);

  // Add/remove favorite artist
  const toggleFavoriteArtist = useCallback((artistName: string): void => {
    if (!artistName) return;

    setFavoriteArtists(prev => {
      const existing = prev.find(fav => fav.name.toLowerCase() === artistName.toLowerCase());
      
      if (existing) {
        // Remove from favorites
        const updated = prev.filter(fav => fav.name.toLowerCase() !== artistName.toLowerCase());
        localStorage.setItem('newstarsradio-favorite-artists', JSON.stringify(updated));
        return updated;
      } else {
        // Add to favorites
        const updated = [...prev, { name: artistName, addedAt: new Date().toISOString() }];
        localStorage.setItem('newstarsradio-favorite-artists', JSON.stringify(updated));
        return updated;
      }
    });
  }, []);

  // Check if artist is favorite
  const isFavoriteArtist = useCallback((artistName: string): boolean => {
    return favoriteArtists.some(fav => fav.name.toLowerCase() === artistName.toLowerCase());
  }, [favoriteArtists]);

  // Update preferences
  const updatePreferences = useCallback((newPrefs: Partial<NotificationPreferences>): void => {
    setPreferences(prev => {
      const updated = { ...prev, ...newPrefs };
      localStorage.setItem('newstarsradio-notification-preferences', JSON.stringify(updated));
      return updated;
    });
  }, []);

  return {
    isSupported,
    permission,
    preferences,
    favoriteArtists,
    requestPermission,
    notifyNowPlaying,
    notifyFavoriteArtist,
    notifyListenerMilestone,
    toggleFavoriteArtist,
    isFavoriteArtist,
    updatePreferences
  };
};

