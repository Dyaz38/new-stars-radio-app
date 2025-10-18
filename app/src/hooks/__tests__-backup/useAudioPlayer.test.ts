import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAudioPlayer } from '../useAudioPlayer';
import { RADIO_CONFIG } from '../../constants';

describe('useAudioPlayer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useAudioPlayer());

    expect(result.current.isPlaying).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.volume).toBe(RADIO_CONFIG.DEFAULT_VOLUME);
    expect(result.current.isMuted).toBe(false);
    expect(result.current.isConnected).toBe(true);
    expect(result.current.audioRef.current).toBe(null);
  });

  it('should handle volume changes correctly', () => {
    const { result } = renderHook(() => useAudioPlayer());

    act(() => {
      const event = { target: { value: '50' } } as React.ChangeEvent<HTMLInputElement>;
      result.current.handleVolumeChange(event);
    });

    expect(result.current.volume).toBe(50);
    expect(result.current.isMuted).toBe(false);
  });

  it('should mute when volume is set to 0', () => {
    const { result } = renderHook(() => useAudioPlayer());

    act(() => {
      const event = { target: { value: '0' } } as React.ChangeEvent<HTMLInputElement>;
      result.current.handleVolumeChange(event);
    });

    expect(result.current.volume).toBe(0);
    expect(result.current.isMuted).toBe(true);
  });

  it('should toggle mute state', () => {
    const { result } = renderHook(() => useAudioPlayer());

    expect(result.current.isMuted).toBe(false);

    act(() => {
      result.current.toggleMute();
    });

    expect(result.current.isMuted).toBe(true);

    act(() => {
      result.current.toggleMute();
    });

    expect(result.current.isMuted).toBe(false);
  });

  it('should handle play/pause toggle successfully', async () => {
    const mockAudioElement = {
      src: '',
      play: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(),
      volume: 0.75,
    };

    const { result } = renderHook(() => useAudioPlayer());

    // Mock the audio ref
    act(() => {
      result.current.audioRef.current = mockAudioElement as any;
    });

    // Test play
    await act(async () => {
      await result.current.togglePlayPause();
    });

    expect(mockAudioElement.src).toBe(RADIO_CONFIG.STREAM_URL);
    expect(mockAudioElement.play).toHaveBeenCalled();
    expect(result.current.isPlaying).toBe(true);
    expect(result.current.isConnected).toBe(true);

    // Test pause
    act(() => {
      result.current.togglePlayPause();
    });

    expect(mockAudioElement.pause).toHaveBeenCalled();
    expect(result.current.isPlaying).toBe(false);
  });

  it('should handle play failure gracefully', async () => {
    const mockAudioElement = {
      src: '',
      play: vi.fn().mockRejectedValue(new Error('Play failed')),
      pause: vi.fn(),
      volume: 0.75,
    };

    const { result } = renderHook(() => useAudioPlayer());

    act(() => {
      result.current.audioRef.current = mockAudioElement as any;
    });

    await act(async () => {
      await result.current.togglePlayPause();
    });

    expect(result.current.isPlaying).toBe(false);
    expect(result.current.isConnected).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it('should update audio volume when volume or mute state changes', () => {
    const mockAudioElement = {
      volume: 0,
    };

    const { result } = renderHook(() => useAudioPlayer());

    act(() => {
      result.current.audioRef.current = mockAudioElement as any;
    });

    // Test volume change
    act(() => {
      const event = { target: { value: '80' } } as React.ChangeEvent<HTMLInputElement>;
      result.current.handleVolumeChange(event);
    });

    expect(mockAudioElement.volume).toBe(0.8);

    // Test mute
    act(() => {
      result.current.toggleMute();
    });

    expect(mockAudioElement.volume).toBe(0);
  });
});


