import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useMetadata } from '../useMetadata';
import { API_ENDPOINTS, RADIO_CONFIG } from '../../constants';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useMetadata', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
    vi.useFakeTimers();
    // Mock fetch to prevent automatic metadata fetching in useEffect
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({})
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with default values', async () => {
    const { result } = renderHook(() => useMetadata());

    // Wait for useEffect to complete
    await act(async () => {
      vi.runOnlyPendingTimers();
    });

    expect(result.current.currentSong.title).toBe('New Stars Radio');
    expect(result.current.currentSong.artist).toBe('Live Stream');
    expect(result.current.nextSong.title).toBe('');
    expect(result.current.isLoadingMetadata).toBe(false);
    expect(result.current.listeners).toBe(2847);
  });

  it('should fetch metadata successfully with current and next song', async () => {
    const mockApiResponse = {
      current: {
        name: 'Test Artist - Test Song',
        metadata: {
          artist_name: 'Test Artist',
          track_title: 'Test Song'
        }
      },
      next: {
        name: 'Next Artist - Next Song',
        metadata: {
          artist_name: 'Next Artist',
          track_title: 'Next Song'
        }
      },
      listeners: 3000
    };

    // Clear the default mock and set up specific response
    mockFetch.mockClear();
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockApiResponse)
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ results: [] }) // iTunes API response
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ results: [] }) // iTunes API response for next song
      });

    const { result } = renderHook(() => useMetadata());

    await act(async () => {
      await result.current.fetchMetadata();
    });

    expect(result.current.currentSong.title).toBe('Test Song');
    expect(result.current.currentSong.artist).toBe('Test Artist');
    expect(result.current.currentSong.time).toBe('LIVE');
    expect(result.current.nextSong.title).toBe('Next Song');
    expect(result.current.nextSong.artist).toBe('Next Artist');
    expect(result.current.listeners).toBe(3000);
  });

  it('should handle API failure gracefully', async () => {
    mockFetch.mockRejectedValue(new Error('API Error'));

    const { result } = renderHook(() => useMetadata());

    await act(async () => {
      await result.current.fetchMetadata();
    });

    expect(result.current.currentSong.title).toBe('New Stars Radio');
    expect(result.current.currentSong.artist).toBe('Live Stream');
    expect(result.current.currentSong.time).toBe('LIVE');
  });

  it('should try multiple API endpoints on failure', async () => {
    // Clear default mock
    mockFetch.mockClear();
    
    // First endpoint fails
    mockFetch.mockRejectedValueOnce(new Error('First API failed'));
    
    // Second endpoint succeeds
    const mockApiResponse = {
      current: {
        metadata: {
          artist_name: 'Second API Artist',
          track_title: 'Second API Song'
        }
      }
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockApiResponse)
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ results: [] }) // iTunes API response
      });

    const { result } = renderHook(() => useMetadata());

    await act(async () => {
      await result.current.fetchMetadata();
    });

    expect(mockFetch).toHaveBeenCalledTimes(3); // 1 failed + 1 success + 1 iTunes
    expect(result.current.currentSong.title).toBe('Second API Song');
    expect(result.current.currentSong.artist).toBe('Second API Artist');
  });

  it('should parse combined artist-title format correctly', async () => {
    mockFetch.mockClear();
    const mockApiResponse = {
      current: {
        name: 'Combined Artist - Combined Song Title'
      }
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockApiResponse)
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ results: [] })
      });

    const { result } = renderHook(() => useMetadata());

    await act(async () => {
      await result.current.fetchMetadata();
    });

    expect(result.current.currentSong.title).toBe('Combined Song Title');
    expect(result.current.currentSong.artist).toBe('Combined Artist');
  });

  it('should decode HTML entities correctly', async () => {
    mockFetch.mockClear();
    const mockApiResponse = {
      current: {
        metadata: {
          artist_name: 'Artist &amp; Band',
          track_title: 'Song &#039;Title&#039; with &quot;Quotes&quot;'
        }
      }
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockApiResponse)
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ results: [] })
      });

    const { result } = renderHook(() => useMetadata());

    await act(async () => {
      await result.current.fetchMetadata();
    });

    expect(result.current.currentSong.artist).toBe('Artist & Band');
    expect(result.current.currentSong.title).toBe('Song \'Title\' with "Quotes"');
  });

  it('should generate gradient classes correctly', () => {
    const { result } = renderHook(() => useMetadata());

    expect(result.current.getGradientClass('gradient-0')).toBe('from-purple-500 to-pink-500');
    expect(result.current.getGradientClass('gradient-1')).toBe('from-blue-500 to-cyan-500');
    expect(result.current.getGradientClass('not-gradient')).toBe('from-purple-500 to-pink-500');
  });

  it('should update listener count periodically', () => {
    const { result } = renderHook(() => useMetadata());
    const initialListeners = result.current.listeners;

    act(() => {
      vi.advanceTimersByTime(RADIO_CONFIG.LISTENER_UPDATE_INTERVAL);
    });

    // Listener count should change (due to random simulation)
    expect(result.current.listeners).not.toBe(initialListeners);
  });
});
