import React from 'react';
import {
  Box,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Check as CheckIcon,
  Add as AddIcon,
  Schedule as ScheduleIcon,
  Notifications as NotificationsIcon,
  LocalPharmacy as PharmacyIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

export const QuickActions: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();

  const actions = [
    { icon: <CheckIcon />, name: 'Log Dose', action: () => navigate('/log-dose') },
    { icon: <AddIcon />, name: 'Add Medication', action: () => navigate('/medications/new') },
    { icon: <ScheduleIcon />, name: 'View Schedule', action: () => navigate('/schedule') },
    { icon: <PharmacyIcon />, name: 'Refills', action: () => navigate('/refills') },
  ];

  if (!isMobile) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        zIndex: theme.zIndex.speedDial,
      }}
    >
      <SpeedDial
        ariaLabel="Quick Actions"
        icon={<SpeedDialIcon />}
        direction="up"
        FabProps={{
          sx: {
            bgcolor: theme.palette.primary.main,
            '&:hover': {
              bgcolor: theme.palette.primary.dark,
            },
          },
        }}
      >
        {actions.map((action) => (
          <SpeedDialAction
            key={action.name}
            icon={action.icon}
            tooltipTitle={action.name}
            onClick={action.action}
            FabProps={{
              sx: {
                bgcolor: theme.palette.background.paper,
                '&:hover': {
                  bgcolor: theme.palette.action.hover,
                },
              },
            }}
          />
        ))}
      </SpeedDial>
    </Box>
  );
};
