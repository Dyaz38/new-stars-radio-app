import { useState, useEffect, useCallback } from 'react';

interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
}

interface RGB {
  r: number;
  g: number;
  b: number;
}

export const useDynamicTheme = () => {
  const [currentPalette, setCurrentPalette] = useState<ColorPalette>({
    primary: '#8b5cf6',
    secondary: '#a855f7', 
    accent: '#c084fc',
    background: '#1f2937',
    text: '#ffffff'
  });
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Extract dominant colors from image
  const extractColorsFromImage = useCallback((imageUrl: string): Promise<ColorPalette> => {
    return new Promise((resolve) => {
      if (!imageUrl || imageUrl.startsWith('gradient-')) {
        // Fallback to current palette for gradients
        resolve(currentPalette);
        return;
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            resolve(currentPalette);
            return;
          }

          // Resize for faster processing
          const size = 150;
          canvas.width = size;
          canvas.height = size;
          
          ctx.drawImage(img, 0, 0, size, size);
          const imageData = ctx.getImageData(0, 0, size, size);
          const data = imageData.data;

          // Color frequency analysis
          const colorCounts: { [key: string]: number } = {};
          const colors: RGB[] = [];

          // Sample every 4th pixel for performance
          for (let i = 0; i < data.length; i += 16) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const alpha = data[i + 3];

            // Skip transparent/very dark/very light pixels
            if (alpha < 128 || (r + g + b) < 50 || (r + g + b) > 720) continue;

            const colorKey = `${Math.floor(r/32)}-${Math.floor(g/32)}-${Math.floor(b/32)}`;
            colorCounts[colorKey] = (colorCounts[colorKey] || 0) + 1;
            colors.push({ r, g, b });
          }

          if (colors.length === 0) {
            resolve(currentPalette);
            return;
          }

          // Find dominant colors
          const sortedColors = Object.entries(colorCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([key]) => {
              const [r, g, b] = key.split('-').map(n => parseInt(n) * 32 + 16);
              return { r, g, b };
            });

          // Generate palette
          const dominant = sortedColors[0];
          const secondary = sortedColors[1] || dominant;
          
          // Create harmonious colors
          const primary = `rgb(${dominant.r}, ${dominant.g}, ${dominant.b})`;
          const secondaryColor = `rgb(${secondary.r}, ${secondary.g}, ${secondary.b})`;
          
          // Generate accent color (complementary)
          const accent = `rgb(${255 - dominant.r}, ${255 - dominant.g}, ${255 - dominant.b})`;
          
          // Ensure good contrast for background and text
          const luminance = (0.299 * dominant.r + 0.587 * dominant.g + 0.114 * dominant.b) / 255;
          const isDark = luminance < 0.5;
          
          const palette: ColorPalette = {
            primary,
            secondary: secondaryColor,
            accent: isDark ? accent : primary,
            background: isDark ? `rgb(${Math.max(0, dominant.r - 50)}, ${Math.max(0, dominant.g - 50)}, ${Math.max(0, dominant.b - 50)})` : '#1f2937',
            text: isDark ? '#ffffff' : '#000000'
          };

          console.log('🎨 Extracted color palette:', palette);
          resolve(palette);
        } catch (error) {
          console.warn('Color extraction failed:', error);
          resolve(currentPalette);
        }
      };

      img.onerror = () => {
        console.warn('Failed to load image for color extraction');
        resolve(currentPalette);
      };

      img.src = imageUrl;
    });
  }, [currentPalette]);

  // Apply theme to CSS custom properties
  const applyTheme = useCallback((palette: ColorPalette) => {
    setIsTransitioning(true);
    
    const root = document.documentElement;
    root.style.setProperty('--color-primary', palette.primary);
    root.style.setProperty('--color-secondary', palette.secondary);
    root.style.setProperty('--color-accent', palette.accent);
    root.style.setProperty('--color-background', palette.background);
    root.style.setProperty('--color-text', palette.text);

    // Add transition class to body for smooth color changes
    document.body.classList.add('theme-transitioning');
    
    setTimeout(() => {
      setIsTransitioning(false);
      document.body.classList.remove('theme-transitioning');
    }, 600);

    setCurrentPalette(palette);
  }, []);

  // Update theme based on cover art
  const updateThemeFromCoverArt = useCallback(async (coverArtUrl: string) => {
    if (!coverArtUrl) return;
    
    try {
      const palette = await extractColorsFromImage(coverArtUrl);
      applyTheme(palette);
    } catch (error) {
      console.warn('Theme update failed:', error);
    }
  }, [extractColorsFromImage, applyTheme]);

  // Initialize CSS custom properties
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--color-primary', currentPalette.primary);
    root.style.setProperty('--color-secondary', currentPalette.secondary);
    root.style.setProperty('--color-accent', currentPalette.accent);
    root.style.setProperty('--color-background', currentPalette.background);
    root.style.setProperty('--color-text', currentPalette.text);
  }, []);

  return {
    currentPalette,
    isTransitioning,
    updateThemeFromCoverArt,
    applyTheme
  };
};
