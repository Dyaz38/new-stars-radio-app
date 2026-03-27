import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useMetadata } from '../useMetadata';
import { RADIO_CONFIG } from '../../constants';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

function mockStreamListeners(listeners: number, ok = true) {
  return {
    ok,
    json: () => Promise.resolve({ listeners }),
  };
}

describe('useMetadata', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : String(input);
      if (url.includes('/stream/listeners')) {
        return Promise.resolve(mockStreamListeners(42));
      }
      return Promise.resolve({
        ok: false,
        json: () => Promise.resolve({}),
      });
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with default values', async () => {
    const { result } = renderHook(() => useMetadata());

    await waitFor(() => {
      expect(result.current.listeners).toBe(42);
    });

    expect(result.current.currentSong.title).toBe('New Stars Radio');
    expect(result.current.currentSong.artist).toBe('Live Stream');
    expect(result.current.nextSong.title).toBe('');
    expect(result.current.isLoadingMetadata).toBe(false);
  });

  it('should fetch metadata successfully with current and next song', async () => {
    const mockApiResponse = {
      current: {
        name: 'Test Artist - Test Song',
        metadata: {
          artist_name: 'Test Artist',
          track_title: 'Test Song',
        },
      },
      next: {
        name: 'Next Artist - Next Song',
        metadata: {
          artist_name: 'Next Artist',
          track_title: 'Next Song',
        },
      },
    };

    mockFetch.mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : String(input);
      if (url.includes('/stream/listeners')) {
        return Promise.resolve(mockStreamListeners(99));
      }
      if (url.includes('live-info') || url.includes('airtime')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockApiResponse),
        });
      }
      if (url.includes('itunes.apple.com')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ results: [] }),
        });
      }
      return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
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
    await waitFor(() => {
      expect(result.current.listeners).toBe(99);
    });
  });

  it('should parse live-info-v2 shape (tracks.current) including genre', async () => {
    const mockApiResponse = {
      tracks: {
        current: {
          metadata: {
            artist_name: 'V2 Artist',
            track_title: 'V2 Song',
            genre: 'Hip-Hop',
          },
        },
      },
    };

    mockFetch.mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : String(input);
      if (url.includes('/stream/listeners')) {
        return Promise.resolve(mockStreamListeners(0));
      }
      if (url.includes('live-info') || url.includes('airtime')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockApiResponse),
        });
      }
      if (url.includes('itunes.apple.com')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ results: [] }),
        });
      }
      return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
    });

    const { result } = renderHook(() => useMetadata());

    await act(async () => {
      await result.current.fetchMetadata();
    });

    expect(result.current.currentSong.artist).toBe('V2 Artist');
    expect(result.current.currentSong.title).toBe('V2 Song');
    expect(result.current.currentSong.genre).toBe('Hip-Hop');
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
    mockFetch.mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : String(input);
      if (url.includes('/stream/listeners')) {
        return Promise.resolve(mockStreamListeners(1));
      }
      if (url.includes('newstarsradio.airtime.pro/api/live-info') && !url.includes('live-info-v2')) {
        return Promise.reject(new Error('First API failed'));
      }
      const mockApiResponse = {
        current: {
          metadata: {
            artist_name: 'Second API Artist',
            track_title: 'Second API Song',
          },
        },
      };
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockApiResponse),
      });
    });

    const { result } = renderHook(() => useMetadata());

    await act(async () => {
      await result.current.fetchMetadata();
    });

    expect(result.current.currentSong.title).toBe('Second API Song');
    expect(result.current.currentSong.artist).toBe('Second API Artist');
  });

  it('should parse combined artist-title format correctly', async () => {
    const mockApiResponse = {
      current: {
        name: 'Combined Artist - Combined Song Title',
      },
    };

    mockFetch.mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : String(input);
      if (url.includes('/stream/listeners')) {
        return Promise.resolve(mockStreamListeners(0));
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockApiResponse),
      });
    });

    const { result } = renderHook(() => useMetadata());

    await act(async () => {
      await result.current.fetchMetadata();
    });

    expect(result.current.currentSong.title).toBe('Combined Song Title');
    expect(result.current.currentSong.artist).toBe('Combined Artist');
  });

  it('should decode HTML entities correctly', async () => {
    const mockApiResponse = {
      current: {
        metadata: {
          artist_name: 'Artist &amp; Band',
          track_title: 'Song &#039;Title&#039; with &quot;Quotes&quot;',
        },
      },
    };

    mockFetch.mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : String(input);
      if (url.includes('/stream/listeners')) {
        return Promise.resolve(mockStreamListeners(0));
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockApiResponse),
      });
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

  it('should update listener count from stream API on poll interval', async () => {
    vi.useFakeTimers();
    let streamCount = 100;
    mockFetch.mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : String(input);
      if (url.includes('/stream/listeners')) {
        const n = streamCount;
        streamCount += 1;
        return Promise.resolve(mockStreamListeners(n));
      }
      return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
    });

    const { result } = renderHook(() => useMetadata());

    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });
    const first = result.current.listeners;
    expect(first).not.toBeNull();
    expect(first).toBeGreaterThanOrEqual(100);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(RADIO_CONFIG.LISTENER_POLL_INTERVAL);
    });
    expect(result.current.listeners).not.toBe(first);
    expect(result.current.listeners).toBeGreaterThan(first!);
  });
});
