import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Box,
  useTheme,
  useMediaQuery,
  Tooltip,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Medication as MedicationIcon,
  Schedule as ScheduleIcon,
  Notifications as NotificationsIcon,
  People as PeopleIcon,
  Settings as SettingsIcon,
  Assessment as AssessmentIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAccessibility } from '../../hooks/useAccessibility';

const drawerWidth = 240;

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  'aria-label'?: string;
}

interface NavItem {
  text: string;
  icon: React.ReactElement;
  path: string;
  description: string;
}

const navItems: NavItem[] = [
  {
    text: 'Dashboard',
    icon: <DashboardIcon />,
    path: '/dashboard',
    description: 'View your medication overview and daily schedule',
  },
  {
    text: 'Medications',
    icon: <MedicationIcon />,
    path: '/medications',
    description: 'Manage your medications and prescriptions',
  },
  {
    text: 'Schedule',
    icon: <ScheduleIcon />,
    path: '/schedule',
    description: 'View and manage your medication schedule',
  },
  {
    text: 'Notifications',
    icon: <NotificationsIcon />,
    path: '/notifications',
    description: 'Configure your medication reminders and alerts',
  },
  {
    text: 'Family',
    icon: <PeopleIcon />,
    path: '/family',
    description: 'Manage family members and caregivers',
  },
  {
    text: 'Reports',
    icon: <AssessmentIcon />,
    path: '/reports',
    description: 'View medication adherence reports and analytics',
  },
  {
    text: 'Settings',
    icon: <SettingsIcon />,
    path: '/settings',
    description: 'Configure application settings and preferences',
  },
];

export const Sidebar: React.FC<SidebarProps> = ({ 
  open, 
  onClose,
  'aria-label': ariaLabel,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const location = useLocation();
  const { settings } = useAccessibility();

  const handleNavigation = (path: string) => {
    navigate(path);
    if (isMobile) {
      onClose();
    }
  };

  const drawer = (
    <Box
      role="navigation"
      aria-label={ariaLabel || 'Main navigation'}
      sx={{
        height: '100%',
        backgroundColor: theme.palette.background.paper,
        color: theme.palette.text.primary,
      }}
    >
      <List>
        {navItems.map((item) => (
          <Tooltip 
            key={item.text}
            title={item.description}
            placement="right"
            arrow
          >
            <ListItem
              button
              onClick={() => handleNavigation(item.path)}
              selected={location.pathname === item.path}
              aria-current={location.pathname === item.path ? 'page' : undefined}
              sx={{
                '&.Mui-selected': {
                  backgroundColor: theme.palette.action.selected,
                  '&:hover': {
                    backgroundColor: theme.palette.action.hover,
                  },
                },
                ...(settings.screenReaderOptimized && {
                  padding: theme.spacing(2),
                  '& .MuiListItemText-primary': {
                    fontSize: '1.1rem',
                  },
                }),
              }}
            >
              <ListItemIcon
                sx={{
                  color: location.pathname === item.path
                    ? theme.palette.primary.main
                    : theme.palette.text.primary,
                  minWidth: 40,
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.text}
                primaryTypographyProps={{
                  style: {
                    fontWeight: location.pathname === item.path ? 600 : 400,
                  },
                }}
              />
            </ListItem>
          </Tooltip>
        ))}
      </List>
      <Divider />
    </Box>
  );

  return (
    <Box
      component="nav"
      sx={{
        width: { sm: drawerWidth },
        flexShrink: { sm: 0 },
      }}
    >
      {isMobile ? (
        <Drawer
          variant="temporary"
          anchor="left"
          open={open}
          onClose={onClose}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile
          }}
          sx={{
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
        >
          {drawer}
        </Drawer>
      ) : (
        <Drawer
          variant="permanent"
          sx={{
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      )}
    </Box>
  );
};
