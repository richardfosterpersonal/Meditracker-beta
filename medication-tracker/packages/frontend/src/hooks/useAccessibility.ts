import { useState, useEffect } from 'react';
import { PaletteMode } from '@mui/material';

type ThemeMode = PaletteMode | 'high-contrast';

interface AccessibilitySettings {
  fontSize: number;
  themeMode: ThemeMode;
  reduceMotion: boolean;
  screenReaderOptimized: boolean;
}

const DEFAULT_SETTINGS: AccessibilitySettings = {
  fontSize: 16,
  themeMode: 'light',
  reduceMotion: false,
  screenReaderOptimized: false,
};

export const useAccessibility = () => {
  const [settings, setSettings] = useState<AccessibilitySettings>(() => {
    const savedSettings = localStorage.getItem('accessibilitySettings');
    return savedSettings ? JSON.parse(savedSettings) : DEFAULT_SETTINGS;
  });

  useEffect(() => {
    localStorage.setItem('accessibilitySettings', JSON.stringify(settings));
    
    // Apply settings to document
    document.documentElement.style.fontSize = `${settings.fontSize}px`;
    
    if (settings.reduceMotion) {
      document.body.style.setProperty('--app-transition-duration', '0s');
    } else {
      document.body.style.removeProperty('--app-transition-duration');
    }

    if (settings.screenReaderOptimized) {
      document.body.classList.add('screen-reader-optimized');
    } else {
      document.body.classList.remove('screen-reader-optimized');
    }
  }, [settings]);

  const updateFontSize = (size: number) => {
    setSettings(prev => ({ ...prev, fontSize: size }));
  };

  const updateThemeMode = (mode: ThemeMode) => {
    setSettings(prev => ({ ...prev, themeMode: mode }));
  };

  const toggleReduceMotion = () => {
    setSettings(prev => ({ ...prev, reduceMotion: !prev.reduceMotion }));
  };

  const toggleScreenReaderOptimized = () => {
    setSettings(prev => ({ 
      ...prev, 
      screenReaderOptimized: !prev.screenReaderOptimized 
    }));
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  return {
    settings,
    updateFontSize,
    updateThemeMode,
    toggleReduceMotion,
    toggleScreenReaderOptimized,
    resetSettings,
  };
};
