import React, { useState } from 'react';
import {
  Box,
  Card,
  Typography,
  IconButton,
  Collapse,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Check as CheckIcon,
  Close as CloseIcon,
  MoreVert as MoreVertIcon,
} from '@mui/icons-material';
import { format, addDays, subDays } from 'date-fns';
import { useSwipeGesture } from '../../hooks/useSwipeGesture';

interface Medication {
  id: string;
  name: string;
  dosage: string;
  time: string;
  taken: boolean;
}

interface SwipeableScheduleProps {
  medications: Medication[];
  onTakeDose: (id: string) => void;
  onSkipDose: (id: string) => void;
}

export const SwipeableSchedule: React.FC<SwipeableScheduleProps> = ({
  medications,
  onTakeDose,
  onSkipDose,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [currentDate, setCurrentDate] = useState(new Date());
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleSwipeLeft = () => {
    setCurrentDate(addDays(currentDate, 1));
  };

  const handleSwipeRight = () => {
    setCurrentDate(subDays(currentDate, 1));
  };

  const swipeHandlers = useSwipeGesture({
    onSwipeLeft: handleSwipeLeft,
    onSwipeRight: handleSwipeRight,
  });

  if (!isMobile) return null;

  return (
    <Box
      {...swipeHandlers}
      sx={{
        mb: 7, // Space for bottom navigation
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          py: 2,
          position: 'sticky',
          top: 0,
          bgcolor: 'background.paper',
          zIndex: 1,
        }}
      >
        <Typography variant="h6">
          {format(currentDate, 'EEEE, MMMM d')}
        </Typography>
      </Box>

      {medications.map((med) => (
        <Card
          key={med.id}
          sx={{
            mb: 2,
            overflow: 'visible',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              p: 2,
              position: 'relative',
            }}
          >
            <Box flex={1}>
              <Typography variant="subtitle1">{med.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {med.dosage} • {med.time}
              </Typography>
            </Box>

            <Box
              sx={{
                display: 'flex',
                gap: 1,
              }}
            >
              <IconButton
                color="primary"
                onClick={() => onTakeDose(med.id)}
                sx={{
                  bgcolor: med.taken ? 'success.main' : 'transparent',
                  color: med.taken ? 'white' : 'inherit',
                  '&:hover': {
                    bgcolor: med.taken ? 'success.dark' : 'action.hover',
                  },
                }}
              >
                <CheckIcon />
              </IconButton>
              <IconButton color="error" onClick={() => onSkipDose(med.id)}>
                <CloseIcon />
              </IconButton>
              <IconButton onClick={() => setExpandedId(expandedId === med.id ? null : med.id)}>
                <MoreVertIcon />
              </IconButton>
            </Box>
          </Box>

          <Collapse in={expandedId === med.id}>
            <Box sx={{ p: 2, pt: 0 }}>
              <Typography variant="body2" color="text.secondary" paragraph>
                Instructions and additional information about the medication can be displayed here.
              </Typography>
            </Box>
          </Collapse>
        </Card>
      ))}

      <Box
        sx={{
          position: 'fixed',
          bottom: 56, // Height of bottom navigation
          left: '50%',
          transform: 'translateX(-50%)',
          bgcolor: 'background.paper',
          px: 2,
          py: 1,
          borderRadius: 2,
          boxShadow: 2,
          zIndex: theme.zIndex.appBar - 1,
        }}
      >
        <Typography variant="caption" color="text.secondary">
          Swipe left/right to change date
        </Typography>
      </Box>
    </Box>
  );
};
