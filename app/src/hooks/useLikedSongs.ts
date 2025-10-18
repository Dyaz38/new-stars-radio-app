import { useState, useEffect, useCallback, useRef } from 'react';
import type { Song, LikedSong, LikeData } from '../types';
import { STORAGE_KEYS } from '../constants';

export const useLikedSongs = () => {
  const [likedSongs, setLikedSongs] = useState<LikeData>({});
  const [isLiked, setIsLiked] = useState(false);
  const [currentSongLikeCount, setCurrentSongLikeCount] = useState(0);
  const likeStartTimeRef = useRef<number | null>(null);
  const currentSongRef = useRef<Song | null>(null);

  // Load liked songs from localStorage on mount
  useEffect(() => {
    const savedLikedSongs = localStorage.getItem(STORAGE_KEYS.LIKED_SONGS);
    if (savedLikedSongs) {
      try {
        const parsed = JSON.parse(savedLikedSongs);
        setLikedSongs(parsed);
      } catch (error) {
        console.error('Error loading liked songs:', error);
      }
    }
  }, []);

  // Save liked songs to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.LIKED_SONGS, JSON.stringify(likedSongs));
  }, [likedSongs]);

  // Generate unique song ID
  const generateSongId = useCallback((song: Song): string => {
    return `${song.artist.toLowerCase().trim()}-${song.title.toLowerCase().trim()}`
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }, []);

  // Update current song and check if it's liked
  const updateCurrentSong = useCallback((song: Song | null) => {
    currentSongRef.current = song;
    
    if (song) {
      const songId = generateSongId(song);
      const likedSong = likedSongs[songId];
      const liked = !!likedSong;
      setIsLiked(liked);
      setCurrentSongLikeCount(liked ? 1 : 0);
    } else {
      setIsLiked(false);
      setCurrentSongLikeCount(0);
    }
  }, [likedSongs, generateSongId]);

  // Stop tracking playtime when song changes or component unmounts
  const stopTrackingPlaytime = useCallback(() => {
    if (likeStartTimeRef.current && currentSongRef.current && isLiked) {
      const playTime = (Date.now() - likeStartTimeRef.current) / 1000; // Convert to seconds
      const songId = generateSongId(currentSongRef.current);
      
      setLikedSongs(prev => {
        const existingLikedSong = prev[songId];
        if (existingLikedSong) {
          return {
            ...prev,
            [songId]: {
              ...existingLikedSong,
              totalPlaytime: existingLikedSong.totalPlaytime + playTime,
            }
          };
        }
        return prev;
      });
    }
    
    likeStartTimeRef.current = null;
  }, [generateSongId, isLiked]);

  // Toggle like status for current song (like/unlike)
  const toggleLike = useCallback(() => {
    const currentSong = currentSongRef.current;
    if (!currentSong) return;

    const songId = generateSongId(currentSong);
    const now = new Date().toISOString();
    
    setLikedSongs(prev => {
      const existingLikedSong = prev[songId];
      
      if (existingLikedSong) {
        // Song is already liked, remove it (unlike)
        stopTrackingPlaytime();
        const { [songId]: removed, ...rest } = prev;
        return rest;
      } else {
        // First time liking this song
        const newLikedSong: LikedSong = {
          id: songId,
          title: currentSong.title,
          artist: currentSong.artist,
          likeCount: 1,
          firstLiked: now,
          lastLiked: now,
          totalPlaytime: 0,
        };
        
        // Start tracking playtime for this like
        likeStartTimeRef.current = Date.now();
        
        return {
          ...prev,
          [songId]: newLikedSong
        };
      }
    });
  }, [generateSongId, stopTrackingPlaytime]);

  // Get all liked songs sorted by like count
  const getAllLikedSongs = useCallback((): LikedSong[] => {
    return Object.values(likedSongs).sort((a, b) => b.likeCount - a.likeCount);
  }, [likedSongs]);

  // Get top liked songs (limit optional)
  const getTopLikedSongs = useCallback((limit?: number): LikedSong[] => {
    const sorted = getAllLikedSongs();
    return limit ? sorted.slice(0, limit) : sorted;
  }, [getAllLikedSongs]);

  // Get total likes across all songs
  const getTotalLikes = useCallback((): number => {
    return Object.values(likedSongs).reduce((total, song) => total + song.likeCount, 0);
  }, [likedSongs]);

  return {
    // State
    likedSongs,
    isLiked,
    currentSongLikeCount,
    
    // Actions
    toggleLike,
    updateCurrentSong,
    stopTrackingPlaytime,
    
    // Getters
    getAllLikedSongs,
    getTopLikedSongs,
    getTotalLikes,
  };
};
