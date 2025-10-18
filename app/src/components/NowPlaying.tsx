import React, { memo, useState } from 'react';
import { Share2, Heart } from 'lucide-react';
import { LazyImage } from './LazyImage';
import { ArtworkModal } from './ArtworkModal';
import type { Song } from '../types';

interface NowPlayingProps {
  currentSong: Song;
  nextSong: Song;
  isLoadingMetadata: boolean;
  onRefreshMetadata: () => void;
  onRefreshArtwork?: () => void;
  onShareCurrentSong: () => void;
  getGradientClass: (identifier: string) => string;
  isLiked: boolean;
  onToggleLike: () => void;
}

const NowPlayingComponent: React.FC<NowPlayingProps> = ({
  currentSong,
  nextSong,
  isLoadingMetadata,
  onRefreshMetadata,
  onRefreshArtwork,
  onShareCurrentSong,
  getGradientClass,
  isLiked,
  onToggleLike,
}) => {
  const [showArtworkModal, setShowArtworkModal] = useState(false);
  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Now Playing</h3>
        <div className="flex items-center space-x-3">
          <button
            onClick={onRefreshMetadata}
            disabled={isLoadingMetadata}
            className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-all disabled:opacity-50"
            title="Refresh track info"
          >
            <div className={`w-4 h-4 ${isLoadingMetadata ? 'animate-spin' : ''}`}>
              🔄
            </div>
          </button>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-sm">LIVE</span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center space-x-4 mb-4">
        {/* Clickable Artwork */}
        <button
          onClick={() => setShowArtworkModal(true)}
          className="group relative transition-transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900 rounded-lg"
          aria-label={`View ${currentSong.title} artwork in full size`}
        >
          {currentSong.coverArt && !currentSong.coverArt.startsWith('gradient-') ? (
            <div className="relative">
              <LazyImage
                src={currentSong.coverArt}
                alt={`${currentSong.title} by ${currentSong.artist}`}
                fallback={<span className="text-2xl text-white">🎵</span>}
                className="w-20 h-20 rounded-lg flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600"
                onError={() => console.log('Cover art failed to load, showing fallback')}
              />
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg flex items-center justify-center">
                <span className="text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                  🔍
                </span>
              </div>
            </div>
          ) : (
            <div className={`w-20 h-20 rounded-lg flex items-center justify-center overflow-hidden relative ${
              currentSong.coverArt && currentSong.coverArt.startsWith('gradient-') 
                ? `bg-gradient-to-br ${getGradientClass(currentSong.coverArt)}`
                : 'bg-gradient-to-br from-blue-500 to-purple-600'
            }`}>
              <span className="text-2xl text-white">🎵</span>
              {/* Hover overlay for gradient */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg flex items-center justify-center">
                <span className="text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                  🔍
                </span>
              </div>
            </div>
          )}
        </button>
        <div className="flex-1">
          <h4 className="font-bold text-lg flex items-center gap-2" data-testid="current-song">
            {currentSong.title}
            {isLoadingMetadata && (
              <div className="w-4 h-4 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" data-testid="loading"></div>
            )}
          </h4>
          <p className="text-gray-300">{currentSong.artist}</p>
          <p className="text-sm text-gray-400">{currentSong.time}</p>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={onToggleLike} 
            aria-label={isLiked ? "Unlike current song" : "Like current song"}
            className={`p-2 rounded-full transition-all flex items-center space-x-1 ${
              isLiked 
                ? 'bg-red-500/30 hover:bg-red-500/40 text-red-300' 
                : 'bg-white/20 hover:bg-white/30 text-white'
            }`}
          >
            <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
          </button>
          <button 
            onClick={onShareCurrentSong} 
            aria-label="Share current song"
            className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-all"
          >
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Up Next Section */}
      {nextSong.title && (
        <div className="mt-6 p-4 bg-gradient-to-r from-green-500/20 to-cyan-500/20 rounded-xl border border-green-400/40">
          <div className="flex items-center space-x-4">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center overflow-hidden ${
              nextSong.coverArt && nextSong.coverArt.startsWith('gradient-') 
                ? `bg-gradient-to-br ${getGradientClass(nextSong.coverArt)}` 
                : 'bg-gradient-to-br from-green-400 to-cyan-500'
            }`}>
              {nextSong.coverArt && !nextSong.coverArt.startsWith('gradient-') ? (
                <img 
                  src={nextSong.coverArt} 
                  alt={`${nextSong.title} by ${nextSong.artist}`}
                  className="w-full h-full object-cover rounded-lg"
                  onError={(e) => {
                    console.log('Next song cover art failed to load');
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <span className="text-lg text-white">⏭️</span>
              )}
            </div>
            <div className="flex-1">
              <p className="text-xs text-green-300 uppercase tracking-widest font-bold mb-1">UP NEXT</p>
              <h5 className="font-bold text-white">{nextSong.title}</h5>
              <p className="text-sm text-green-200">{nextSong.artist}</p>
            </div>
          </div>
        </div>
      )}

      {/* Artwork Modal */}
      <ArtworkModal
        isOpen={showArtworkModal}
        onClose={() => setShowArtworkModal(false)}
        song={currentSong}
        getGradientClass={getGradientClass}
        onRefreshArtwork={onRefreshArtwork}
      />
    </div>
  );
};

// Memoize NowPlaying component with custom comparison
export const NowPlaying = memo(NowPlayingComponent, (prevProps, nextProps) => {
  return (
    prevProps.currentSong.title === nextProps.currentSong.title &&
    prevProps.currentSong.artist === nextProps.currentSong.artist &&
    prevProps.currentSong.coverArt === nextProps.currentSong.coverArt &&
    prevProps.nextSong.title === nextProps.nextSong.title &&
    prevProps.nextSong.artist === nextProps.nextSong.artist &&
    prevProps.nextSong.coverArt === nextProps.nextSong.coverArt &&
    prevProps.isLoadingMetadata === nextProps.isLoadingMetadata &&
    prevProps.isLiked === nextProps.isLiked &&
    prevProps.onRefreshMetadata === nextProps.onRefreshMetadata &&
    prevProps.onShareCurrentSong === nextProps.onShareCurrentSong &&
    prevProps.getGradientClass === nextProps.getGradientClass &&
    prevProps.onToggleLike === nextProps.onToggleLike
  );
});
