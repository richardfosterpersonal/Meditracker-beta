import React from 'react';
import {
  Menu,
  MenuItem,
  IconButton,
  Typography,
  Switch,
  Slider,
  Box,
  Divider,
  Tooltip,
} from '@mui/material';
import {
  AccessibilityNew as AccessibilityIcon,
  TextFields as TextIcon,
  Speed as MotionIcon,
  ScreenSearchDesktop as ScreenReaderIcon,
  RestartAlt as ResetIcon,
} from '@mui/icons-material';
import { ThemeToggle } from './ThemeToggle';
import { useAccessibility } from '../../hooks/useAccessibility';

export const AccessibilityMenu: React.FC = () => {
  const {
    settings,
    updateFontSize,
    updateThemeMode,
    toggleReduceMotion,
    toggleScreenReaderOptimized,
    resetSettings,
  } = useAccessibility();

  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <>
      <Tooltip title="Accessibility settings">
        <IconButton
          onClick={handleClick}
          color="inherit"
          aria-label="Open accessibility menu"
        >
          <AccessibilityIcon />
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          sx: {
            width: 320,
            p: 2,
          },
        }}
      >
        <Typography variant="h6" gutterBottom>
          Accessibility Settings
        </Typography>

        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Theme
          </Typography>
          <ThemeToggle
            currentMode={settings.themeMode}
            onModeChange={updateThemeMode}
          />
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Font Size
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <TextIcon sx={{ mr: 2 }} />
            <Slider
              value={settings.fontSize}
              onChange={(_, value) => updateFontSize(value as number)}
              min={12}
              max={24}
              step={1}
              marks={[
                { value: 12, label: 'A' },
                { value: 16, label: 'A' },
                { value: 20, label: 'A' },
                { value: 24, label: 'A' },
              ]}
              aria-label="Font size"
            />
          </Box>
        </Box>

        <MenuItem>
          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            <MotionIcon sx={{ mr: 2 }} />
            <Typography>Reduce Motion</Typography>
            <Box sx={{ ml: 'auto' }}>
              <Switch
                checked={settings.reduceMotion}
                onChange={toggleReduceMotion}
                inputProps={{ 'aria-label': 'Reduce motion' }}
              />
            </Box>
          </Box>
        </MenuItem>

        <MenuItem>
          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            <ScreenReaderIcon sx={{ mr: 2 }} />
            <Typography>Screen Reader Optimized</Typography>
            <Box sx={{ ml: 'auto' }}>
              <Switch
                checked={settings.screenReaderOptimized}
                onChange={toggleScreenReaderOptimized}
                inputProps={{ 'aria-label': 'Screen reader optimized' }}
              />
            </Box>
          </Box>
        </MenuItem>

        <Divider sx={{ my: 2 }} />

        <MenuItem onClick={resetSettings}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <ResetIcon sx={{ mr: 2 }} />
            <Typography>Reset Settings</Typography>
          </Box>
        </MenuItem>
      </Menu>
    </>
  );
};
