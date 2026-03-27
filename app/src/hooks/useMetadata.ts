import { useState, useEffect, useCallback } from 'react';
import type { Song, AirtimeApiResponse, MusicBrainzSearchResponse, CoverArtArchiveResponse, ArtworkResult } from '../types';
import { API_ENDPOINTS, RADIO_CONFIG, GRADIENT_CLASSES, MUSICBRAINZ_CONFIG, getStreamListenersUrl } from '../constants';
import { normalizeAirtimeLiveInfo } from '../api/airtimeLiveInfo';

export const useMetadata = () => {
  const [currentSong, setCurrentSong] = useState<Song>({
    title: 'Loading...',
    artist: 'Fetching track info...',
    time: '0:00 / 0:00',
    coverArt: ''
  });
  const [nextSong, setNextSong] = useState<Song>({
    title: '',
    artist: '',
    time: '',
    coverArt: ''
  });
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);
  /** Live Icecast count from ad-server proxy; null until first successful fetch. */
  const [listeners, setListeners] = useState<number | null>(null);
  const [artworkCache, setArtworkCache] = useState<Map<string, string>>(new Map());

  // Decode HTML entities and fix character encoding issues
  const decodeHtmlEntities = useCallback((text: string): string => {
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
  }, []);

  // Rate limiter for MusicBrainz API (1 call per second max)
  const [lastMusicBrainzCall, setLastMusicBrainzCall] = useState<number>(0);
  
  
  // iTunes API - Fast and reliable fallback
  const fetchITunesArtwork = useCallback(async (artist: string, title: string): Promise<ArtworkResult | null> => {
    try {
      const searchQuery = encodeURIComponent(`${artist} ${title}`);
      console.log(`🍎 Searching iTunes for: "${artist}" - "${title}"`);
      
      const response = await fetch(`${API_ENDPOINTS.ITUNES}?term=${searchQuery}&entity=song&limit=10`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`🎵 iTunes found ${data.results.length} tracks`);
        
        if (data.results && data.results.length > 0) {
          // Find best match or use first result
          const track = data.results[0];
          let artworkUrl = track.artworkUrl100;
          
          // Get highest quality artwork available
          if (artworkUrl) {
            artworkUrl = artworkUrl.replace('100x100bb', '600x600bb'); // Upgrade to 600x600
            console.log(`🖼️ iTunes found artwork:`, artworkUrl);
            
            return {
              url: artworkUrl,
              width: 600,
              height: 600,
              quality: 80,
              source: 'itunes'
            };
          }
        }
      }
    } catch (error) {
      console.log('iTunes API failed:', error);
    }
    return null;
  }, []);

  // MusicBrainz API - Primary source with proper rate limiting
  const fetchMusicBrainzArtwork = useCallback(async (artist: string, title: string): Promise<ArtworkResult | null> => {
    try {
      // Enforce rate limiting: wait at least 1.1 seconds between calls
      const now = Date.now();
      const timeSinceLastCall = now - lastMusicBrainzCall;
      if (timeSinceLastCall < MUSICBRAINZ_CONFIG.RATE_LIMIT_DELAY) {
        const waitTime = MUSICBRAINZ_CONFIG.RATE_LIMIT_DELAY - timeSinceLastCall;
        console.log(`⏱️ MusicBrainz rate limit: waiting ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      
      setLastMusicBrainzCall(Date.now());
      
      // Try multiple search strategies
      const searchStrategies = [
        `release:"${title}" AND artist:"${artist}"`, // Exact match
        `artist:"${artist}" AND recording:"${title}"`, // Alternative format
        `"${artist}" "${title}"`, // Simple text search
        title, // Just the title
      ];
      
      for (const [index, strategy] of searchStrategies.entries()) {
        const searchQuery = encodeURIComponent(strategy);
        console.log(`🎵 MusicBrainz Strategy ${index + 1}: ${strategy}`);
        
        const response = await fetch(
          `${API_ENDPOINTS.MUSICBRAINZ_SEARCH}?query=${searchQuery}&fmt=json&limit=${MUSICBRAINZ_CONFIG.SEARCH_LIMIT}`,
          {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'User-Agent': MUSICBRAINZ_CONFIG.USER_AGENT,
            },
          }
        );

        if (response.ok) {
          const data: MusicBrainzSearchResponse = await response.json();
          console.log(`📀 MusicBrainz Strategy ${index + 1} found ${data.releases.length} releases`);
          
          // Find the best matching release with cover art
          for (const release of data.releases) {
            if (release['cover-art-archive']?.artwork && release['cover-art-archive'].front) {
              console.log(`🎨 Trying release: ${release.title} by ${release['artist-credit']?.[0]?.artist?.name}`);
              
              try {
                // Rate limit Cover Art Archive calls too
                await new Promise(resolve => setTimeout(resolve, 500)); // 0.5s between CAA calls
                
                // Fetch cover art from Cover Art Archive
                const artResponse = await fetch(
                  `${API_ENDPOINTS.COVERART_ARCHIVE}/${release.id}`,
                  {
                    method: 'GET',
                    headers: { 
                      'Accept': 'application/json',
                      'User-Agent': MUSICBRAINZ_CONFIG.USER_AGENT,
                    },
                  }
                );
                
                if (artResponse.ok) {
                  const artData: CoverArtArchiveResponse = await artResponse.json();
                  const frontCover = artData.images.find(img => img.front && img.approved);
                  
                  if (frontCover) {
                    // Use the highest resolution available
                    const artworkUrl = frontCover.thumbnails['1200'] || frontCover.thumbnails.large || frontCover.image;
                    console.log(`🖼️ MusicBrainz found artwork (Strategy ${index + 1}):`, artworkUrl);
                    
                    return {
                      url: artworkUrl,
                      width: 1200,
                      height: 1200,
                      quality: 90,
                      source: 'musicbrainz'
                    };
                  }
                }
              } catch (artError) {
                console.log(`❌ Cover Art Archive failed for release ${release.id}:`, artError);
              }
            }
          }
          
          if (data.releases.length > 0) {
            // If we found releases but no artwork, break the loop
            break;
          }
        } else {
          console.log(`❌ MusicBrainz API returned status: ${response.status} ${response.statusText}`);
        }
        
        // Add small delay between strategies to be respectful
        if (index < searchStrategies.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
    } catch (error) {
      console.log('MusicBrainz API failed:', error);
    }
    return null;
  }, [lastMusicBrainzCall]);


  // Enhanced cover art fetching with MusicBrainz only
  const getEnhancedCoverArt = useCallback(async (artist: string, title: string, forceRefresh: boolean = false): Promise<string> => {
    if (!artist || !title) return '';
    
    const cleanArtist = artist.replace(/[^\w\s]/gi, '').trim();
    const cleanTitle = title.replace(/[^\w\s]/gi, '').trim();
    
    if (!cleanArtist || !cleanTitle) return '';

    const cacheKey = `${cleanArtist}-${cleanTitle}`;
    
    // Check cache first (unless forcing refresh)
    if (!forceRefresh && artworkCache.has(cacheKey)) {
      const cachedArt = artworkCache.get(cacheKey)!;
      console.log(`🎨 Using cached cover art for: "${cleanArtist}" - "${cleanTitle}"`);
      return cachedArt;
    }

    console.log(`🎨 ${forceRefresh ? 'Refreshing' : 'Searching for'} cover art: "${cleanArtist}" - "${cleanTitle}"`);
    console.log(`🎯 Strategy: MusicBrainz PRIMARY → iTunes FALLBACK → Gradient`);

    // Strategy 1: Try MusicBrainz first (highest quality)
    try {
      const musicBrainzResult = await fetchMusicBrainzArtwork(cleanArtist, cleanTitle);
      
      if (musicBrainzResult) {
        console.log(`🥇 MusicBrainz API: Found ${musicBrainzResult.width}x${musicBrainzResult.height} image`);
        console.log(`✅ 🎵 Selected MUSICBRAINZ cover art (${musicBrainzResult.width}x${musicBrainzResult.height})`);
        console.log(`🖼️ URL: ${musicBrainzResult.url}`);
        
        // Cache the result
        setArtworkCache(prev => new Map(prev.set(cacheKey, musicBrainzResult.url)));
        
        return musicBrainzResult.url;
      } else {
        console.log(`📍 MusicBrainz API: No cover art found, trying iTunes fallback...`);
      }
    } catch (error) {
      console.log(`❌ MusicBrainz API: Error occurred, trying iTunes fallback:`, error);
    }

    // Strategy 2: Try iTunes as fallback (fast and reliable)
    try {
      const iTunesResult = await fetchITunesArtwork(cleanArtist, cleanTitle);
      
      if (iTunesResult) {
        console.log(`🥈 iTunes API: Found ${iTunesResult.width}x${iTunesResult.height} image`);
        console.log(`✅ 🍎 Selected ITUNES cover art (${iTunesResult.width}x${iTunesResult.height})`);
        console.log(`🖼️ URL: ${iTunesResult.url}`);
        
        // Cache the result
        setArtworkCache(prev => new Map(prev.set(cacheKey, iTunesResult.url)));
        
        return iTunesResult.url;
      } else {
        console.log(`📍 iTunes API: No cover art found, using gradient placeholder`);
      }
    } catch (error) {
      console.log(`❌ iTunes API: Error occurred, using gradient placeholder:`, error);
    }

    // Fallback: Generate a colorful placeholder
    const colorIndex = (cleanArtist.length + cleanTitle.length) % GRADIENT_CLASSES.length;
    const fallbackArt = `gradient-${colorIndex}`;
    console.log(`🎨 Using colorful placeholder for: ${cleanArtist} - ${cleanTitle}`);
    
    // Cache the fallback too
    setArtworkCache(prev => new Map(prev.set(cacheKey, fallbackArt)));
    
    return fallbackArt;
  }, [fetchMusicBrainzArtwork, artworkCache]);

  // Helper function to get gradient class for placeholder artwork
  const getGradientClass = useCallback((identifier: string): string => {
    if (identifier.startsWith('gradient-')) {
      const index = parseInt(identifier.replace('gradient-', ''));
      return GRADIENT_CLASSES[index] || GRADIENT_CLASSES[0];
    }
    
    return GRADIENT_CLASSES[0];
  }, []);

  // Fetch metadata from New Stars Radio
  const fetchMetadata = useCallback(async () => {
    setIsLoadingMetadata(true);
    try {
      for (const url of API_ENDPOINTS.METADATA) {
        try {
          console.log(`🎵 Trying metadata from: ${url}`);
          const response = await fetch(url, {
            method: 'GET',
            mode: 'cors',
            headers: {
              'Accept': 'application/json'
            }
          });

          if (response.ok) {
            const data: AirtimeApiResponse = await response.json();
            console.log('📡 Metadata response:', data);

            // v1: root `current` / `next`; v2: `tracks.current` / `tracks.next`
            const { current: currentTrack, next: nextTrack } = normalizeAirtimeLiveInfo(data);
            
            // Handle Airtime Pro API response formats
            let artist = 'New Stars Radio';
            let title = 'Live Stream';
            let trackInfo = null;
            let genre: string | undefined;
            
            if (currentTrack) {
              // Airtime Pro live-info format
              if (currentTrack.name) {
                trackInfo = decodeHtmlEntities(currentTrack.name);
              }
              
              // Check for separate artist and title fields
              if (currentTrack.metadata) {
                if (currentTrack.metadata.artist_name) {
                  artist = decodeHtmlEntities(currentTrack.metadata.artist_name);
                }
                if (currentTrack.metadata.track_title) {
                  title = decodeHtmlEntities(currentTrack.metadata.track_title);
                } else if (currentTrack.metadata.title) {
                  title = decodeHtmlEntities(currentTrack.metadata.title);
                }
                if (currentTrack.metadata.genre) {
                  genre = decodeHtmlEntities(String(currentTrack.metadata.genre));
                }
              }
              
              // If we have separate artist and title, use them
              if (artist !== 'New Stars Radio' || title !== 'Live Stream') {
                const coverArt = await getEnhancedCoverArt(artist, title);
                setCurrentSong({
                  title: title,
                  artist: artist,
                  time: 'LIVE',
                  coverArt,
                  ...(genre ? { genre } : {}),
                });
              } else if (trackInfo) {
                // Parse combined format "Artist - Title"
                const [parsedArtist, parsedTitle] = trackInfo.includes(' - ') 
                  ? trackInfo.split(' - ', 2)
                  : ['New Stars Radio', trackInfo];
                
                const coverArt = await getEnhancedCoverArt(parsedArtist, parsedTitle);
                setCurrentSong({
                  title: parsedTitle || 'Live Stream',
                  artist: parsedArtist || 'New Stars Radio',
                  time: 'LIVE',
                  coverArt,
                  ...(genre ? { genre } : {}),
                });
              }
              
              // Handle next song if available
              if (nextTrack) {
                let nextArtist = 'New Stars Radio';
                let nextTitle = '';
                let nextGenre: string | undefined;
                
                // First priority: use metadata fields (most reliable)
                if (nextTrack.metadata && nextTrack.metadata.artist_name && nextTrack.metadata.track_title) {
                  nextArtist = decodeHtmlEntities(nextTrack.metadata.artist_name);
                  nextTitle = decodeHtmlEntities(nextTrack.metadata.track_title);
                  if (nextTrack.metadata.genre) {
                    nextGenre = decodeHtmlEntities(String(nextTrack.metadata.genre));
                  }
                  console.log(`🎵 Next song from metadata: "${nextArtist}" - "${nextTitle}"`);
                }
                // Fallback: parse the name field
                else if (nextTrack.name) {
                  const nextTrackInfo = decodeHtmlEntities(nextTrack.name);
                  const [artist, title] = nextTrackInfo.includes(' - ') 
                    ? nextTrackInfo.split(' - ', 2)
                    : ['New Stars Radio', nextTrackInfo];
                  nextArtist = artist;
                  nextTitle = title;
                  if (nextTrack.metadata?.genre) {
                    nextGenre = decodeHtmlEntities(String(nextTrack.metadata.genre));
                  }
                  console.log(`🎵 Next song from name: "${nextArtist}" - "${nextTitle}"`);
                }
                
                // Only set if we have valid data
                if (nextTitle && nextTitle.trim() !== '' && nextTitle !== 'Live Stream') {
                  const nextCoverArt = await getEnhancedCoverArt(nextArtist, nextTitle);
                  setNextSong({
                    title: nextTitle,
                    artist: nextArtist,
                    time: 'UP NEXT',
                    coverArt: nextCoverArt,
                    ...(nextGenre ? { genre: nextGenre } : {}),
                  });
                  console.log(`✅ Next song set: "${nextArtist}" - "${nextTitle}"`);
                } else {
                  console.log('❌ No valid next song title found');
                  setNextSong({ title: '', artist: '', time: '', coverArt: '' });
                }
              } else {
                console.log('❌ No next song data available');
                setNextSong({ title: '', artist: '', time: '', coverArt: '' });
              }
            }
            
            if (currentTrack || trackInfo) {
              console.log(`🎶 Updated: "${artist}" - "${title}"`);
              return; // Success, exit loop
            }
          }
        } catch (error) {
          console.log(`🔄 ${url} failed, trying next...`);
        }
      }
      
      // Fallback if all endpoints fail
      console.warn('📻 All metadata endpoints failed, using fallback');
      setCurrentSong({
        title: 'New Stars Radio',
        artist: 'Live Stream',
        time: 'LIVE',
        coverArt: ''
      });
      
    } catch (error) {
      console.error('❌ Metadata fetch error:', error);
      setCurrentSong({
        title: 'New Stars Radio', 
        artist: 'Live Stream',
        time: 'LIVE',
        coverArt: ''
      });
    } finally {
      setIsLoadingMetadata(false);
    }
  }, [decodeHtmlEntities, getEnhancedCoverArt]);

  // Set up metadata fetching
  useEffect(() => {
    // Initial fetch
    fetchMetadata();
    
    // Update metadata every 30 seconds
    const metadataInterval = setInterval(fetchMetadata, RADIO_CONFIG.METADATA_REFRESH_INTERVAL);
    
    return () => clearInterval(metadataInterval);
  }, [fetchMetadata]);

  // Real-time listener count (Icecast via backend — avoids browser CORS to port 8000)
  const fetchStreamListeners = useCallback(async () => {
    try {
      const url = getStreamListenersUrl();
      const response = await fetch(url, {
        method: 'GET',
        mode: 'cors',
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) return;
      const data = await response.json();
      if (typeof data.listeners === 'number' && Number.isFinite(data.listeners)) {
        setListeners(Math.max(0, Math.floor(data.listeners)));
      }
    } catch {
      // Keep last known value; UI shows "—" until first success
    }
  }, []);

  useEffect(() => {
    fetchStreamListeners();
    const interval = setInterval(fetchStreamListeners, RADIO_CONFIG.LISTENER_POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchStreamListeners]);

  // Function to refresh artwork for current song
  const refreshCurrentArtwork = useCallback(async () => {
    if (currentSong.artist && currentSong.title) {
      const newArtwork = await getEnhancedCoverArt(currentSong.artist, currentSong.title, true);
      setCurrentSong(prev => ({ ...prev, coverArt: newArtwork }));
    }
  }, [currentSong.artist, currentSong.title, getEnhancedCoverArt]);


  return {
    currentSong,
    nextSong,
    isLoadingMetadata,
    listeners,
    fetchMetadata,
    refreshCurrentArtwork,
    getGradientClass,
  };
};

