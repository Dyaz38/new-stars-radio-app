// TypeScript interfaces for better type safety and code organization

export interface Song {
  title: string;
  artist: string;
  time: string;
  coverArt?: string;
}

export interface ScheduleShow {
  id: number;
  time: string;
  show: string;
  dj: string;
  description: string;
  current: boolean;
}

export interface Post {
  id: number;
  content: string;
  time: string;
  likes: number;
}

export interface AirtimeApiResponse {
  current?: {
    name?: string;
    metadata?: {
      artist_name?: string;
      track_title?: string;
      title?: string;
    };
  };
  next?: {
    name?: string;
    metadata?: {
      artist_name?: string;
      track_title?: string;
      title?: string;
    };
  };
  listeners?: number;
  currentShow?: {
    name?: string;
  };
  live?: {
    current_song?: string;
  };
  icestats?: {
    source?: {
      title?: string;
    } | Array<{
      title?: string;
    }>;
  };
}


export interface MusicBrainzRelease {
  id: string;
  title: string;
  'artist-credit': Array<{
    artist: {
      name: string;
    };
  }>;
  date?: string;
  'cover-art-archive'?: {
    artwork: boolean;
    count: number;
    front: boolean;
    back: boolean;
  };
}

export interface MusicBrainzSearchResponse {
  releases: MusicBrainzRelease[];
  count: number;
  offset: number;
}

export interface CoverArtArchiveResponse {
  images: Array<{
    approved: boolean;
    back: boolean;
    comment: string;
    edit: number;
    front: boolean;
    id: string;
    image: string;
    thumbnails: {
      '250': string;
      '500': string;
      '1200': string;
      large: string;
      small: string;
    };
    types: string[];
  }>;
  release: string;
}

export interface ArtworkResult {
  url: string;
  width: number;
  height: number;
  quality: number;
  source: 'musicbrainz' | 'itunes' | 'gradient';
}

export interface AppState {
  isPlaying: boolean;
  isLoading: boolean;
  volume: number;
  isConnected: boolean;
  currentShow: string;
  currentDJ: string;
  currentSong: Song;
  nextSong: Song;
  isLoadingMetadata: boolean;
  listeners: number;
  isMuted: boolean;
  schedule: ScheduleShow[];
  recentPosts: Post[];
}

export interface LikedSong {
  id: string; // unique identifier based on title + artist
  title: string;
  artist: string;
  likeCount: number;
  firstLiked: string; // timestamp
  lastLiked: string; // timestamp
  totalPlaytime: number; // seconds the song was liked while playing
}

export interface LikeData {
  [songId: string]: LikedSong;
}

// Genius API interfaces
export interface GeniusSearchResponse {
  response: {
    hits: Array<{
      type: string;
      result: {
        id: number;
        title: string;
        primary_artist: {
          name: string;
        };
        url: string;
        lyrics_state: string;
      };
    }>;
  };
}

export interface GeniusSongResponse {
  response: {
    song: {
      id: number;
      title: string;
      primary_artist: {
        name: string;
      };
      url: string;
      lyrics_state: string;
    };
  };
}

export interface LyricsResult {
  lyrics: string;
  source: 'genius';
  songId: number;
  url: string;
}

