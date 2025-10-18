import { useState, useRef, useCallback, useEffect } from 'react';
import { RADIO_CONFIG } from '../constants';

export const useAudioPlayer = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [volume, setVolume] = useState<number>(RADIO_CONFIG.DEFAULT_VOLUME);
  const [isMuted, setIsMuted] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlayPause = useCallback(async () => {
    if (!isPlaying) {
      setIsLoading(true);
      try {
        if (audioRef.current) {
          audioRef.current.src = RADIO_CONFIG.STREAM_URL;
          await audioRef.current.play();
          setIsPlaying(true);
          setIsConnected(true);
        }
      } catch (error) {
        console.error('Failed to start stream:', error);
        setIsConnected(false);
      } finally {
        setIsLoading(false);
      }
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    }
  }, [isPlaying]);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseInt(e.target.value);
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  // Set up audio volume control
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume / 100;
    }
  }, [volume, isMuted]);

  // Simulate stream connection
  useEffect(() => {
    if (isPlaying) {
      setIsLoading(true);
      const timeout = setTimeout(() => {
        setIsLoading(false);
        setIsConnected(true);
      }, 1500);
      return () => clearTimeout(timeout);
    }
  }, [isPlaying]);

  return {
    isPlaying,
    isLoading,
    volume,
    isMuted,
    isConnected,
    audioRef,
    togglePlayPause,
    handleVolumeChange,
    toggleMute,
  };
};

