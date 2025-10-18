import React, { useRef, useEffect, useState, useCallback } from 'react';

interface AudioVisualizerProps {
  isPlaying: boolean;
  audioElement?: HTMLAudioElement | null;
  className?: string;
  style?: React.CSSProperties;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ 
  isPlaying, 
  audioElement, 
  className = '',
  style = {}
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [useRealAudio, setUseRealAudio] = useState(false);
  const [initAttempts, setInitAttempts] = useState(0);

  // AUDIO-FIRST SAFE MODE - Guaranteed Working Audio
  const initializeAudio = useCallback(async () => {
    if (!audioElement || isInitialized) return;

    // CONCLUSION: Web Audio API is fundamentally incompatible with live radio streams
    // ANY attempt to use createMediaElementSource() breaks audio playback
    // PRIORITY: Protect audio at all costs
    
    console.log('🎵 Audio-Safe Mode: Protecting your radio stream');
    console.log('🔒 Web Audio API disabled to prevent audio interference');
    
    // Use beautiful simulation mode - no audio interference
    setUseRealAudio(false);
    setIsInitialized(true);
    
    console.log('✅ Audio-safe visualizer ready - your radio will play perfectly!');
  }, [audioElement, isInitialized]);

  // Animation loop - real audio analysis OR simulation
  const animate = useCallback(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas with gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, 'rgba(139, 92, 246, 0.1)');
    gradient.addColorStop(1, 'rgba(168, 85, 247, 0.05)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let frequencyData: Uint8Array;
    let numBars: number;

    if (useRealAudio && analyserRef.current && dataArrayRef.current) {
      // 🎵 REAL AUDIO ANALYSIS - Synced to actual music!
      analyserRef.current.getByteFrequencyData(dataArrayRef.current);
      frequencyData = dataArrayRef.current;
      numBars = Math.min(frequencyData.length, 64); // Limit for performance
    } else {
      // Fallback simulation mode
      const time = Date.now() * 0.001;
      numBars = 40;
      frequencyData = new Uint8Array(numBars);
      
      // Generate pseudo-musical data
      for (let i = 0; i < numBars; i++) {
        const baseFreq = Math.sin(time * 2 + i * 0.5) * 0.5 + 0.5;
        const highFreq = Math.sin(time * 8 + i * 1.2) * 0.3 + 0.3;
        const randomness = Math.sin(time * 15 + i * 2) * 0.2;
        frequencyData[i] = ((baseFreq + highFreq + randomness) / 3) * 255;
      }
    }

    // Draw frequency bars
    const barWidth = canvas.width / numBars;
    let x = 0;

    for (let i = 0; i < numBars; i++) {
      // Get frequency intensity (0-255 -> 0-1)
      const rawIntensity = frequencyData[i] / 255;
      
      // Apply some visual enhancements for better appearance
      const intensity = Math.pow(rawIntensity, 0.6); // Slight curve for better visual
      const barHeight = intensity * canvas.height * 0.8;
      
      // Create gradient for each bar
      const barGradient = ctx.createLinearGradient(0, canvas.height - barHeight, 0, canvas.height);
      
      // Color based on frequency position and intensity
      const hue = 280 + (i / numBars) * 80 + intensity * 20; // Purple to pink/cyan spectrum
      const saturation = 70 + intensity * 20;
      const lightness = 50 + intensity * 20;
      
      barGradient.addColorStop(0, `hsla(${hue}, ${saturation}%, ${lightness + 10}%, ${0.9 + intensity * 0.1})`);
      barGradient.addColorStop(0.6, `hsla(${hue}, ${saturation + 10}%, ${lightness}%, ${0.7 + intensity * 0.2})`);
      barGradient.addColorStop(1, `hsla(${hue}, ${saturation + 20}%, ${lightness - 10}%, ${0.5 + intensity * 0.3})`);

      ctx.fillStyle = barGradient;
      
      // Draw the frequency bar
      const barX = x;
      const barY = canvas.height - barHeight;
      
      ctx.fillRect(barX, barY, barWidth - 1, barHeight);

      // Add glow effect for high frequencies
      if (intensity > 0.6) {
        ctx.shadowColor = `hsla(${hue}, ${saturation + 20}%, ${lightness + 10}%, ${intensity * 0.8})`;
        ctx.shadowBlur = 6;
        ctx.fillRect(barX, barY, barWidth - 1, barHeight);
        ctx.shadowBlur = 0;
      }

      x += barWidth;
    }

    // Continue animation if playing
    if (isPlaying) {
      animationRef.current = requestAnimationFrame(animate);
    }
  }, [isPlaying, useRealAudio]);

  // Reset attempts when audio element changes
  useEffect(() => {
    setInitAttempts(0);
    setIsInitialized(false);
    setUseRealAudio(false);
  }, [audioElement]);

  // Initialize audio when element is available
  useEffect(() => {
    if (audioElement && isPlaying && !isInitialized) {
      // Small delay to ensure audio element is ready
      const timer = setTimeout(() => {
        initializeAudio();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [audioElement, isPlaying, isInitialized, initializeAudio]);

  // Cleanup on unmount (minimal - audio-safe mode)
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Start/stop animation based on play state
  useEffect(() => {
    if (isPlaying && isInitialized) {
      animate();
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, isInitialized, animate]);

  // Handle canvas resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  return (
    <div className={`relative overflow-hidden rounded-xl ${className}`} style={style}>
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ 
          width: '100%', 
          height: '100%',
          background: 'transparent'
        }}
      />
      
      {/* Fallback for when audio is not playing */}
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex space-x-1">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className="w-1 bg-gradient-to-t from-purple-600 to-pink-500 rounded-full opacity-30"
                style={{
                  height: `${20 + Math.random() * 40}%`,
                  animationDelay: `${i * 0.1}s`
                }}
              />
            ))}
          </div>
        </div>
      )}
      
      {/* Enhanced Status indicator */}
      {isPlaying && (
        <div className="absolute top-2 right-2 flex items-center space-x-2">
          {!isInitialized ? (
            // Initializing
            <>
              <div className="w-2 h-2 rounded-full animate-spin border border-blue-400 border-t-transparent" />
              <span className="text-xs text-white/60 font-mono">
                INIT {initAttempts}/3
              </span>
            </>
          ) : (
            // Initialized
            <>
              <div className={`w-2 h-2 rounded-full animate-pulse ${
                useRealAudio ? 'bg-green-400' : 'bg-yellow-400'
              }`} />
              <span className="text-xs text-white/60 font-mono">
                {useRealAudio ? '🎵 LIVE' : '🎨 SIM'}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
};
