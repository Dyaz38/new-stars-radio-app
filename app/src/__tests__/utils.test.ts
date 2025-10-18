import { describe, it, expect } from 'vitest';
import { GRADIENT_CLASSES } from '../constants';

// Test utility functions that are used across the app

describe('Utility Functions', () => {
  describe('HTML Entity Decoding', () => {
    // We'll test the decoding function by creating a standalone version
    const decodeHtmlEntities = (text: string): string => {
      if (!text) return text;
      
      // Handle HTML entities
      let decoded = text
        .replace(/&amp;/g, '&')
        .replace(/&#39;/g, "'")
        .replace(/&#039;/g, "'")
        .replace(/&#x27;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&#34;/g, '"')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&nbsp;/g, ' ')
        .replace(/&#160;/g, ' ');

      // Handle Unicode entities
      decoded = decoded
        .replace(/&#8217;/g, "'")
        .replace(/&#8216;/g, "'")
        .replace(/&#8220;/g, '"')
        .replace(/&#8221;/g, '"')
        .replace(/&#8211;/g, '–')
        .replace(/&#8212;/g, '—')
        .replace(/&#8230;/g, '...')
        .replace(/&#169;/g, '©')
        .replace(/&#174;/g, '®')
        .replace(/&#8482;/g, '™');

      // Browser native decoding for remaining entities
      try {
        const textArea = document.createElement('textarea');
        textArea.innerHTML = decoded;
        decoded = textArea.value;
      } catch (e) {
        console.warn('Browser decoding failed, using manual replacements only');
      }
      
      return decoded.trim();
    };

    it('should decode basic HTML entities', () => {
      expect(decodeHtmlEntities('Artist &amp; Band')).toBe('Artist & Band');
      expect(decodeHtmlEntities('Song &quot;Title&quot;')).toBe('Song "Title"');
      expect(decodeHtmlEntities('Song &lt;Test&gt;')).toBe('Song <Test>');
    });

    it('should decode apostrophes correctly', () => {
      expect(decodeHtmlEntities('Don&#39;t Stop')).toBe("Don't Stop");
      expect(decodeHtmlEntities('Don&#039;t Stop')).toBe("Don't Stop");
      expect(decodeHtmlEntities('Don&apos;t Stop')).toBe("Don't Stop");
    });

    it('should decode Unicode entities', () => {
      expect(decodeHtmlEntities('Smart&#8217;s Quote')).toBe("Smart's Quote");
      expect(decodeHtmlEntities('Em&#8212;dash')).toBe("Em—dash");
      expect(decodeHtmlEntities('Copyright&#169;')).toBe("Copyright©");
    });

    it('should handle empty or null input', () => {
      expect(decodeHtmlEntities('')).toBe('');
      expect(decodeHtmlEntities(null as any)).toBe(null);
      expect(decodeHtmlEntities(undefined as any)).toBe(undefined);
    });

    it('should trim whitespace', () => {
      expect(decodeHtmlEntities('  Test Song  ')).toBe('Test Song');
    });
  });

  describe('Time Parsing', () => {
    // Test the time parsing function used in schedule management
    const parseTime = (timeStr: string): number => {
      const [time, period] = timeStr.split(' ');
      const [hours, minutes] = time.split(':').map(Number);
      let totalMinutes = hours * 60 + minutes;
      
      if (period === 'PM' && hours !== 12) totalMinutes += 12 * 60;
      if (period === 'AM' && hours === 12) totalMinutes = minutes;
      
      return totalMinutes;
    };

    it('should parse AM times correctly', () => {
      expect(parseTime('6:00 AM')).toBe(360); // 6 * 60
      expect(parseTime('10:30 AM')).toBe(630); // 10 * 60 + 30
      expect(parseTime('12:00 AM')).toBe(0); // Midnight
      expect(parseTime('12:30 AM')).toBe(30); // 12:30 AM is 30 minutes past midnight
    });

    it('should parse PM times correctly', () => {
      expect(parseTime('6:00 PM')).toBe(1080); // 18 * 60
      expect(parseTime('10:30 PM')).toBe(1350); // 22 * 60 + 30
      expect(parseTime('12:00 PM')).toBe(720); // Noon (12 * 60)
      expect(parseTime('12:30 PM')).toBe(750); // 12:30 PM
    });

    it('should handle edge cases', () => {
      expect(parseTime('1:00 AM')).toBe(60);
      expect(parseTime('1:00 PM')).toBe(780); // 13 * 60
      expect(parseTime('11:59 PM')).toBe(1439); // 23 * 60 + 59
    });
  });

  describe('Gradient Class Generation', () => {
    const getGradientClass = (identifier: string): string => {
      if (identifier.startsWith('gradient-')) {
        const index = parseInt(identifier.replace('gradient-', ''));
        return GRADIENT_CLASSES[index] || GRADIENT_CLASSES[0];
      }
      
      return GRADIENT_CLASSES[0];
    };

    it('should return correct gradient for valid indices', () => {
      expect(getGradientClass('gradient-0')).toBe('from-purple-500 to-pink-500');
      expect(getGradientClass('gradient-1')).toBe('from-blue-500 to-cyan-500');
      expect(getGradientClass('gradient-2')).toBe('from-green-500 to-teal-500');
    });

    it('should return default gradient for invalid indices', () => {
      expect(getGradientClass('gradient-999')).toBe('from-purple-500 to-pink-500');
      expect(getGradientClass('gradient--1')).toBe('from-purple-500 to-pink-500');
    });

    it('should return default gradient for non-gradient identifiers', () => {
      expect(getGradientClass('not-a-gradient')).toBe('from-purple-500 to-pink-500');
      expect(getGradientClass('http://example.com/image.jpg')).toBe('from-purple-500 to-pink-500');
    });

    it('should handle empty or invalid input', () => {
      expect(getGradientClass('')).toBe('from-purple-500 to-pink-500');
      expect(getGradientClass('gradient-')).toBe('from-purple-500 to-pink-500');
    });
  });

  describe('Song Title Parsing', () => {
    const parseSongTitle = (trackInfo: string): { artist: string; title: string } => {
      if (trackInfo.includes(' - ')) {
        const [artist, title] = trackInfo.split(' - ', 2);
        return { artist: artist.trim(), title: title.trim() };
      }
      return { artist: 'New Stars Radio', title: trackInfo.trim() };
    };

    it('should parse artist and title from combined string', () => {
      const result = parseSongTitle('Taylor Swift - Shake It Off');
      expect(result.artist).toBe('Taylor Swift');
      expect(result.title).toBe('Shake It Off');
    });

    it('should handle multiple dashes correctly', () => {
      const result = parseSongTitle('Artist Name - Song - With - Dashes');
      expect(result.artist).toBe('Artist Name');
      expect(result.title).toBe('Song - With - Dashes');
    });

    it('should handle no dash separator', () => {
      const result = parseSongTitle('Just a Song Title');
      expect(result.artist).toBe('New Stars Radio');
      expect(result.title).toBe('Just a Song Title');
    });

    it('should trim whitespace', () => {
      const result = parseSongTitle('  Artist Name  -  Song Title  ');
      expect(result.artist).toBe('Artist Name');
      expect(result.title).toBe('Song Title');
    });

    it('should handle empty input', () => {
      const result = parseSongTitle('');
      expect(result.artist).toBe('New Stars Radio');
      expect(result.title).toBe('');
    });
  });
});


