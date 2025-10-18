import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { NowPlaying } from '../NowPlaying';
import type { Song } from '../../types';

describe('NowPlaying', () => {
  const mockCurrentSong: Song = {
    title: 'Test Song',
    artist: 'Test Artist',
    time: 'LIVE',
    coverArt: 'https://example.com/cover.jpg'
  };

  const mockNextSong: Song = {
    title: 'Next Song',
    artist: 'Next Artist',
    time: 'UP NEXT',
    coverArt: 'gradient-0'
  };

  const defaultProps = {
    currentSong: mockCurrentSong,
    nextSong: mockNextSong,
    isLoadingMetadata: false,
    onRefreshMetadata: vi.fn(),
    onShareCurrentSong: vi.fn(),
    getGradientClass: vi.fn().mockReturnValue('from-purple-500 to-pink-500'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render current song information', () => {
    render(<NowPlaying {...defaultProps} />);
    
    expect(screen.getByText('Test Song')).toBeInTheDocument();
    expect(screen.getByText('Test Artist')).toBeInTheDocument();
    expect(screen.getAllByText('LIVE').length).toBeGreaterThan(0);
  });

  it('should render next song when available', () => {
    render(<NowPlaying {...defaultProps} />);
    
    expect(screen.getByText('Next Song')).toBeInTheDocument();
    expect(screen.getByText('Next Artist')).toBeInTheDocument();
    expect(screen.getByText('UP NEXT')).toBeInTheDocument();
  });

  it('should not render next song section when next song title is empty', () => {
    const emptyNextSong: Song = {
      title: '',
      artist: '',
      time: '',
      coverArt: ''
    };

    render(
      <NowPlaying 
        {...defaultProps} 
        nextSong={emptyNextSong} 
      />
    );
    
    expect(screen.queryByText('UP NEXT')).not.toBeInTheDocument();
  });

  it('should call onRefreshMetadata when refresh button is clicked', () => {
    const mockRefresh = vi.fn();
    render(
      <NowPlaying 
        {...defaultProps} 
        onRefreshMetadata={mockRefresh} 
      />
    );
    
    const refreshButton = screen.getByTitle('Refresh track info');
    fireEvent.click(refreshButton);
    
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('should call onShareCurrentSong when share button is clicked', () => {
    const mockShare = vi.fn();
    render(
      <NowPlaying 
        {...defaultProps} 
        onShareCurrentSong={mockShare} 
      />
    );
    
    const shareButton = screen.getByLabelText('Share current song');
    fireEvent.click(shareButton);
    
    expect(mockShare).toHaveBeenCalledTimes(1);
  });

  it('should disable refresh button when loading metadata', () => {
    render(<NowPlaying {...defaultProps} isLoadingMetadata={true} />);
    
    const refreshButton = screen.getByTitle('Refresh track info');
    expect(refreshButton).toBeDisabled();
  });

  it('should show loading spinner when loading metadata', () => {
    render(<NowPlaying {...defaultProps} isLoadingMetadata={true} />);
    
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('should display cover art image when URL is provided', () => {
    render(<NowPlaying {...defaultProps} />);
    
    const coverImage = screen.getByAltText('Test Song by Test Artist');
    expect(coverImage).toBeInTheDocument();
    expect(coverImage).toHaveAttribute('src', 'https://example.com/cover.jpg');
  });

  it('should display gradient background when gradient identifier is used', () => {
    const songWithGradient: Song = {
      ...mockCurrentSong,
      coverArt: 'gradient-2'
    };

    render(
      <NowPlaying 
        {...defaultProps} 
        currentSong={songWithGradient} 
      />
    );
    
    expect(defaultProps.getGradientClass).toHaveBeenCalledWith('gradient-2');
  });

  it('should display fallback emoji when no cover art', () => {
    const songWithoutCover: Song = {
      ...mockCurrentSong,
      coverArt: ''
    };

    render(
      <NowPlaying 
        {...defaultProps} 
        currentSong={songWithoutCover} 
      />
    );
    
    expect(screen.getByText('🎵')).toBeInTheDocument();
  });

  it('should handle image load errors gracefully', () => {
    render(<NowPlaying {...defaultProps} />);
    
    const coverImage = screen.getByAltText('Test Song by Test Artist');
    fireEvent.error(coverImage);
    
    // Image should be hidden on error
    expect(coverImage.style.display).toBe('none');
  });

  it('should display next song gradient background correctly', () => {
    render(<NowPlaying {...defaultProps} />);
    
    expect(defaultProps.getGradientClass).toHaveBeenCalledWith('gradient-0');
  });

  it('should show LIVE indicator', () => {
    render(<NowPlaying {...defaultProps} />);
    
    const liveIndicators = screen.getAllByText('LIVE');
    expect(liveIndicators.length).toBeGreaterThan(0);
    
    // Should have animated pulse dot
    const pulseDot = document.querySelector('.animate-pulse');
    expect(pulseDot).toBeInTheDocument();
  });

  it('should render Now Playing header', () => {
    render(<NowPlaying {...defaultProps} />);
    
    expect(screen.getByText('Now Playing')).toBeInTheDocument();
  });

  it('should show refresh emoji in button', () => {
    render(<NowPlaying {...defaultProps} />);
    
    expect(screen.getByText('🔄')).toBeInTheDocument();
  });
});
