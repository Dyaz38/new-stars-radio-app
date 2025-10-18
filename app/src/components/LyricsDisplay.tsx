import React from 'react';
import type { LyricsResult } from '../types';

interface LyricsDisplayProps {
  lyrics: LyricsResult | null;
  isLoading: boolean;
  currentSong: {
    title: string;
    artist: string;
  };
}

export const LyricsDisplay: React.FC<LyricsDisplayProps> = ({ 
  lyrics, 
  isLoading, 
  currentSong 
}) => {
  if (isLoading) {
    return (
      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
        <div className="flex items-center justify-center space-x-2">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          <span className="text-white/80">Searching for lyrics...</span>
        </div>
        <div className="mt-2 text-center">
          <p className="text-white/50 text-xs">
            Searching Genius for "{currentSong.title}" by {currentSong.artist}
          </p>
        </div>
      </div>
    );
  }

  if (!lyrics) {
    // Check if this might be due to missing API token
    const geniusToken = import.meta.env.VITE_GENIUS_ACCESS_TOKEN;
    const isTokenMissing = !geniusToken || geniusToken === 'your_genius_api_token_here';
    
    return (
      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
        <div className="text-center">
          <div className="text-white/60 mb-2">
            <svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
          
          {isTokenMissing ? (
            <>
              <h3 className="text-white font-medium mb-2">🔑 Lyrics Service Setup Required</h3>
              <p className="text-white/60 text-sm mb-4">
                To display lyrics, you need to configure the Genius API token
              </p>
              <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4 text-left">
                <h4 className="text-blue-300 font-medium text-sm mb-2">Setup Instructions:</h4>
                <ol className="text-blue-200/80 text-xs space-y-1 list-decimal list-inside">
                  <li>Go to <span className="font-mono bg-blue-900/30 px-1 rounded">genius.com/api-clients</span></li>
                  <li>Create a new API client</li>
                  <li>Copy the "Client Access Token"</li>
                  <li>Create a <span className="font-mono bg-blue-900/30 px-1 rounded">.env</span> file in the app folder</li>
                  <li>Add: <span className="font-mono bg-blue-900/30 px-1 rounded">VITE_GENIUS_ACCESS_TOKEN=your_token</span></li>
                  <li>Restart the development server</li>
                </ol>
              </div>
            </>
          ) : (
            <>
              <h3 className="text-white font-medium mb-1">No Lyrics Found</h3>
              <p className="text-white/60 text-sm">
                Lyrics for "{currentSong.title}" by {currentSong.artist} are not available
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-white font-medium text-lg">{currentSong.title}</h3>
          <p className="text-white/70 text-sm">by {currentSong.artist}</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="bg-green-500/20 text-green-400 px-2 py-1 rounded-full text-xs font-medium">
            Genius
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {lyrics.lyrics.startsWith('Lyrics available at:') ? (
          // Show link to Genius page
          <div className="text-center py-8">
            <div className="text-white/60 mb-4">
              <svg className="w-16 h-16 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </div>
            <p className="text-white/80 mb-4">
              Full lyrics are available on Genius.com
            </p>
            <a 
              href={lyrics.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-black px-6 py-3 rounded-full font-medium hover:from-yellow-300 hover:to-orange-400 transition-all duration-200 transform hover:scale-105"
            >
              <span>View on Genius</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        ) : (
          // Show actual lyrics (if we had them)
          <div className="text-white/90 leading-relaxed whitespace-pre-line">
            {lyrics.lyrics}
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-white/10">
        <div className="flex items-center justify-between text-xs text-white/50">
          <span>Powered by Genius</span>
          <span>Song ID: {lyrics.songId}</span>
        </div>
      </div>
    </div>
  );
};
