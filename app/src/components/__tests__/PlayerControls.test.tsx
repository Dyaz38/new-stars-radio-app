import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PlayerControls } from '../PlayerControls';

describe('PlayerControls', () => {
  const defaultProps = {
    isPlaying: false,
    isLoading: false,
    volume: 75,
    isMuted: false,
    onTogglePlayPause: vi.fn(),
    onVolumeChange: vi.fn(),
    onToggleMute: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render play button when not playing', () => {
    render(<PlayerControls {...defaultProps} />);
    
    const playButton = screen.getByLabelText('Play');
    expect(playButton).toBeInTheDocument();
  });

  it('should render pause button when playing', () => {
    render(<PlayerControls {...defaultProps} isPlaying={true} />);
    
    const pauseButton = screen.getByLabelText('Pause');
    expect(pauseButton).toBeInTheDocument();
  });

  it('should show loading spinner when loading', () => {
    render(<PlayerControls {...defaultProps} isLoading={true} />);
    
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('should call onTogglePlayPause when main button is clicked', () => {
    const mockTogglePlayPause = vi.fn();
    render(
      <PlayerControls 
        {...defaultProps} 
        onTogglePlayPause={mockTogglePlayPause} 
      />
    );
    
    const playButton = screen.getByLabelText('Play');
    fireEvent.click(playButton);
    
    expect(mockTogglePlayPause).toHaveBeenCalledTimes(1);
  });

  it('should disable main button when loading', () => {
    render(<PlayerControls {...defaultProps} isLoading={true} />);
    
    const mainButton = screen.getByLabelText('Play');
    expect(mainButton).toBeDisabled();
  });

  it('should call onToggleMute when volume button is clicked', () => {
    const mockToggleMute = vi.fn();
    render(
      <PlayerControls 
        {...defaultProps} 
        onToggleMute={mockToggleMute} 
      />
    );
    
    const volumeButton = screen.getAllByRole('button')[0]; // Volume button is first
    fireEvent.click(volumeButton);
    
    expect(mockToggleMute).toHaveBeenCalledTimes(1);
  });

  it('should show muted volume icon when muted', () => {
    render(<PlayerControls {...defaultProps} isMuted={true} />);
    
    const volumeIcon = document.querySelector('.text-red-400');
    expect(volumeIcon).toBeInTheDocument();
  });

  it('should handle volume slider changes', () => {
    const mockVolumeChange = vi.fn();
    render(
      <PlayerControls 
        {...defaultProps} 
        onVolumeChange={mockVolumeChange} 
      />
    );
    
    const volumeSlider = screen.getByRole('slider');
    fireEvent.change(volumeSlider, { target: { value: '50' } });
    
    expect(mockVolumeChange).toHaveBeenCalledTimes(1);
  });

  it('should display correct volume value', () => {
    render(<PlayerControls {...defaultProps} volume={85} />);
    
    expect(screen.getByText('85')).toBeInTheDocument();
  });

  it('should display 0 volume when muted', () => {
    render(<PlayerControls {...defaultProps} volume={75} isMuted={true} />);
    
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('should set volume slider to 0 when muted', () => {
    render(<PlayerControls {...defaultProps} volume={75} isMuted={true} />);
    
    const volumeSlider = screen.getByRole('slider') as HTMLInputElement;
    expect(volumeSlider.value).toBe('0');
  });

  it('should set volume slider to actual volume when not muted', () => {
    render(<PlayerControls {...defaultProps} volume={85} isMuted={false} />);
    
    const volumeSlider = screen.getByRole('slider') as HTMLInputElement;
    expect(volumeSlider.value).toBe('85');
  });
});
