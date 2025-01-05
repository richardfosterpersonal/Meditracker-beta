import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  IconButton,
  Tooltip,
  Badge,
} from '@mui/material';
import {
  AddCircle as AddIcon,
  Notifications as NotificationsIcon,
  LocalPharmacy as PharmacyIcon,
  Schedule as ScheduleIcon,
  People as PeopleIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useQuickActionBadges } from '../../hooks/useQuickActionBadges';

interface QuickAction {
  icon: React.ReactNode;
  label: string;
  action: () => void;
  badge?: number;
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info';
}

export const QuickActions: React.FC = () => {
  const navigate = useNavigate();
  const badges = useQuickActionBadges();

  const actions: QuickAction[] = [
    {
      icon: <AddIcon />,
      label: 'Add Medication',
      action: () => navigate('/medications/add'),
      color: 'primary',
    },
    {
      icon: <NotificationsIcon />,
      label: 'Reminders',
      action: () => navigate('/reminders'),
      badge: badges.reminders,
      color: 'info',
    },
    {
      icon: <PharmacyIcon />,
      label: 'Refills',
      action: () => navigate('/medications/refills'),
      badge: badges.refills,
      color: 'warning',
    },
    {
      icon: <ScheduleIcon />,
      label: 'Schedule',
      action: () => navigate('/schedule'),
      color: 'secondary',
    },
    {
      icon: <PeopleIcon />,
      label: 'Family',
      action: () => navigate('/family'),
      color: 'info',
    },
    {
      icon: <WarningIcon />,
      label: 'Interactions',
      action: () => navigate('/medications/interactions'),
      badge: badges.interactions,
      color: 'error',
    },
  ];

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Quick Actions
        </Typography>
        <Grid container spacing={2} justifyContent="center">
          {actions.map((action, index) => (
            <Grid item key={index}>
              <Tooltip title={action.label}>
                <Box 
                  sx={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center',
                    gap: 0.5,
                  }}
                >
                  <IconButton
                    onClick={action.action}
                    color={action.color}
                    size="large"
                    aria-label={action.label}
                    sx={{
                      backgroundColor: (theme) => 
                        theme.palette.mode === 'light' 
                          ? theme.palette.grey[100] 
                          : theme.palette.grey[800],
                      '&:hover': {
                        backgroundColor: (theme) =>
                          theme.palette.mode === 'light'
                            ? theme.palette.grey[200]
                            : theme.palette.grey[700],
                      },
                    }}
                  >
                    {action.badge ? (
                      <Badge badgeContent={action.badge} color={action.color}>
                        {action.icon}
                      </Badge>
                    ) : (
                      action.icon
                    )}
                  </IconButton>
                  <Typography variant="caption" color="textSecondary">
                    {action.label}
                  </Typography>
                </Box>
              </Tooltip>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  );
};
