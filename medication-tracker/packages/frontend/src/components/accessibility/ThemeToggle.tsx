import React from 'react';
import {
  IconButton,
  Tooltip,
  useTheme,
  PaletteMode,
} from '@mui/material';
import {
  Brightness4 as DarkIcon,
  Brightness7 as LightIcon,
  ContrastOutlined as HighContrastIcon,
} from '@mui/icons-material';

type ThemeMode = PaletteMode | 'high-contrast';

interface ThemeToggleProps {
  currentMode: ThemeMode;
  onModeChange: (mode: ThemeMode) => void;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  currentMode,
  onModeChange,
}) => {
  const theme = useTheme();

  const getNextMode = (): ThemeMode => {
    switch (currentMode) {
      case 'light':
        return 'dark';
      case 'dark':
        return 'high-contrast';
      default:
        return 'light';
    }
  };

  const getIcon = () => {
    switch (currentMode) {
      case 'light':
        return <DarkIcon />;
      case 'dark':
        return <HighContrastIcon />;
      default:
        return <LightIcon />;
    }
  };

  const getTooltipText = () => {
    switch (currentMode) {
      case 'light':
        return 'Switch to dark mode';
      case 'dark':
        return 'Switch to high contrast mode';
      default:
        return 'Switch to light mode';
    }
  };

  return (
    <Tooltip title={getTooltipText()}>
      <IconButton
        onClick={() => onModeChange(getNextMode())}
        color="inherit"
        aria-label={getTooltipText()}
      >
        {getIcon()}
      </IconButton>
    </Tooltip>
  );
};
