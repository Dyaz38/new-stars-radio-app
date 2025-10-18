import React, { memo } from 'react';
import { Play, Pause, Volume2, Heart } from 'lucide-react';

interface PlayerControlsProps {
  isPlaying: boolean;
  isLoading: boolean;
  volume: number;
  isMuted: boolean;
  isLiked: boolean;
  onTogglePlayPause: () => void;
  onVolumeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onToggleMute: () => void;
  onToggleLike: () => void;
}

const PlayerControlsComponent: React.FC<PlayerControlsProps> = ({
  isPlaying,
  isLoading,
  volume,
  isMuted,
  isLiked,
  onTogglePlayPause,
  onVolumeChange,
  onToggleMute,
  onToggleLike,
}) => {
  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-6">
      <div className="flex items-center justify-center space-x-8 mb-6">
        <button
          onClick={onToggleMute}
          className="p-3 bg-white/20 rounded-full hover:bg-white/30 transition-all"
        >
          <Volume2 className={`w-6 h-6 ${isMuted ? 'text-red-400' : ''}`} />
        </button>
        
        <button
          onClick={onTogglePlayPause}
          disabled={isLoading}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          className="p-4 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full hover:from-pink-600 hover:to-purple-600 transition-all disabled:opacity-50"
        >
          {isLoading ? (
            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : isPlaying ? (
            <Pause className="w-8 h-8" />
          ) : (
            <Play className="w-8 h-8 ml-1" />
          )}
        </button>

        <button 
          onClick={onToggleLike}
          aria-label={isLiked ? "Unlike current song" : "Like current song"}
          className={`p-3 rounded-full transition-all ${
            isLiked 
              ? 'bg-red-500/30 hover:bg-red-500/40 text-red-300' 
              : 'bg-white/20 hover:bg-white/30 text-white'
          }`}
        >
          <Heart className={`w-6 h-6 ${isLiked ? 'fill-current' : ''}`} />
        </button>
      </div>

      {/* Volume Control */}
      <div className="flex items-center space-x-4">
        <Volume2 className="w-5 h-5 text-gray-400" />
        <input
          type="range"
          min="0"
          max="100"
          value={isMuted ? 0 : volume}
          onChange={onVolumeChange}
          className="flex-1 h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
        />
        <span className="text-sm text-gray-400 w-8">{isMuted ? 0 : volume}</span>
      </div>
    </div>
  );
};

// Memoize the component to prevent unnecessary re-renders
export const PlayerControls = memo(PlayerControlsComponent, (prevProps, nextProps) => {
  // Custom comparison function for optimal re-render prevention
  return (
    prevProps.isPlaying === nextProps.isPlaying &&
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.volume === nextProps.volume &&
    prevProps.isMuted === nextProps.isMuted &&
    prevProps.isLiked === nextProps.isLiked &&
    prevProps.onTogglePlayPause === nextProps.onTogglePlayPause &&
    prevProps.onVolumeChange === nextProps.onVolumeChange &&
    prevProps.onToggleMute === nextProps.onToggleMute &&
    prevProps.onToggleLike === nextProps.onToggleLike
  );
});
