import React from 'react';
import { X } from 'lucide-react';
import type { Song } from '../types';

interface ArtworkModalProps {
  isOpen: boolean;
  onClose: () => void;
  song: Song;
  getGradientClass: (identifier: string) => string;
  onRefreshArtwork?: () => void;
}

export const ArtworkModal: React.FC<ArtworkModalProps> = React.memo(({
  isOpen,
  onClose,
  song,
  getGradientClass,
  onRefreshArtwork
}) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="artwork-title"
      tabIndex={-1}
      style={{
        position: 'fixed',
        zIndex: 999999
      }}
    >
      <div className="relative max-w-4xl w-full max-h-[75vh] bg-gray-900 rounded-2xl overflow-hidden shadow-2xl transform -translate-y-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-all"
          aria-label="Close artwork view"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Main Content - Flex Layout */}
        <div className="flex flex-col md:flex-row">
          {/* Artwork Container */}
          <div className="relative flex-1">
            {song.coverArt && !song.coverArt.startsWith('gradient-') ? (
              <div className="relative">
                {/* Main Artwork */}
                <img
                  src={song.coverArt}
                  alt={`${song.title} - ${song.artist} album artwork`}
                  className="w-full h-auto max-h-[70vh] object-contain bg-gray-800"
                  loading="lazy"
                />
              </div>
            ) : (
              /* Gradient Fallback */
              <div className={`w-full h-96 bg-gradient-to-br ${getGradientClass(song.coverArt || 'gradient-0')} flex items-center justify-center relative`}>
                <div className="text-center text-white">
                  <div className="text-6xl mb-4">🎵</div>
                  <div className="text-xl font-semibold opacity-80">No Artwork Available</div>
                </div>
              </div>
            )}
          </div>

          {/* Song Information Panel - Right Side */}
          <div className="md:w-80 bg-black/80 backdrop-blur-md p-8 flex flex-col justify-center">
            <div className="space-y-4">
              {/* Song Title */}
              <h2 
                id="artwork-title"
                className="text-3xl md:text-4xl font-bold text-white leading-tight"
                style={{ 
                  textShadow: '2px 2px 8px rgba(0,0,0,0.9)'
                }}
              >
                {song.title}
              </h2>
              
              {/* Artist Name */}
              <p 
                className="text-xl md:text-2xl text-gray-200"
                style={{ 
                  textShadow: '1px 1px 6px rgba(0,0,0,0.8)'
                }}
              >
                by {song.artist}
              </p>
              
              {/* Live Status */}
              {song.time === 'LIVE' && (
                <div className="flex items-center space-x-3 mt-6 p-3 bg-red-500/20 rounded-lg border border-red-500/30">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-lg font-medium text-red-400 uppercase tracking-wider">
                    Live Now
                  </span>
                </div>
              )}
              
              {/* Up Next Status */}
              {song.time === 'UP NEXT' && (
                <div className="flex items-center space-x-3 mt-6 p-3 bg-yellow-500/20 rounded-lg border border-yellow-500/30">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse" />
                  <span className="text-lg font-medium text-yellow-400 uppercase tracking-wider">
                    Up Next
                  </span>
                </div>
              )}

              {/* Artwork Actions */}
              <div className="mt-6 flex space-x-3">
                <button
                  onClick={() => window.open(`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(`${song.artist} ${song.title} album cover`)}`, '_blank')}
                  className="flex-1 px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-lg text-blue-300 text-sm transition-colors"
                >
                  🔍 Search Cover
                </button>
                <button
                  onClick={() => onRefreshArtwork && onRefreshArtwork()}
                  className="flex-1 px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-lg text-purple-300 text-sm transition-colors"
                  disabled={!onRefreshArtwork}
                >
                  🔄 Retry APIs
                </button>
              </div>

              {/* Radio Station Info */}
              <div className="mt-8 pt-6 border-t border-white/20">
                <div className="text-center">
                  <p className="text-sm text-gray-400">
                    🎵 New Stars Radio
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Tomorrow's Stars, Today
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
