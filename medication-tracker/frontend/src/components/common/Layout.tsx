import React, { useState } from 'react';
import { Box, AppBar, Toolbar, IconButton, Typography, useTheme, Tooltip } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { Sidebar } from '../Navigation/Sidebar';
import { AccessibilityMenu } from '../accessibility/AccessibilityMenu';
import { useAccessibility } from '../../hooks/useAccessibility';

interface LayoutProps {
  children: React.ReactNode;
}

const drawerWidth = 240;

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();
  const { settings } = useAccessibility();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        minHeight: '100vh',
        // Apply reduced motion if enabled
        '& *': {
          transition: settings.reduceMotion ? 'none !important' : undefined,
        },
      }}
    >
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <Tooltip title="Toggle navigation menu">
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2, display: { sm: 'none' } }}
            >
              <MenuIcon />
            </IconButton>
          </Tooltip>
          <Typography 
            variant="h6" 
            noWrap 
            component="h1"
            sx={{ flexGrow: 1 }}
          >
            Medication Tracker
          </Typography>
          <AccessibilityMenu />
        </Toolbar>
      </AppBar>

      <Sidebar 
        open={mobileOpen} 
        onClose={handleDrawerToggle}
        aria-label="Navigation sidebar"
      />

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          mt: 8,
          // Ensure sufficient color contrast
          backgroundColor: theme.palette.background.default,
          color: theme.palette.text.primary,
        }}
      >
        <Box 
          role="main"
          tabIndex={-1}
          sx={{ outline: 'none' }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
};
