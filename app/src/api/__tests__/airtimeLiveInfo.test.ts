import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchGenreForCurrentTrackIfMatch } from '../airtimeLiveInfo';

describe('fetchGenreForCurrentTrackIfMatch', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('matches previous track when current has already advanced (race)', async () => {
    const payload = {
      env: 'production',
      current: {
        name: 'Blxst - Pressure',
        metadata: {
          artist_name: 'Blxst',
          track_title: 'Pressure',
          genre: 'Rap/Hip Hop',
        },
      },
      previous: {
        name: 'Ella Mai - Boo&#039;d Up',
        metadata: {
          artist_name: 'Ella Mai',
          track_title: 'Boo&#039;d Up',
          genre: 'R&amp;B/Soul',
        },
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(payload),
    });

    const genre = await fetchGenreForCurrentTrackIfMatch('Ella Mai', "Boo'd Up");
    expect(genre).toBe('R&B/Soul');
  });

  it('decodes HTML entities in titles so keys match the UI', async () => {
    const payload = {
      current: {
        metadata: {
          artist_name: 'Ella Mai',
          track_title: 'Boo&#039;d Up',
          genre: 'R&amp;B/Soul',
        },
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(payload),
    });

    const genre = await fetchGenreForCurrentTrackIfMatch('Ella Mai', "Boo'd Up");
    expect(genre).toBe('R&B/Soul');
  });
});
