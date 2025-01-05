import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  useTheme
} from '@mui/material';
import { AdherenceMetrics } from '../../types/analytics';
import { format } from 'date-fns';

interface AdherenceCardProps {
  metrics: AdherenceMetrics | null;
}

const AdherenceCard: React.FC<AdherenceCardProps> = ({ metrics }) => {
  const theme = useTheme();

  if (!metrics) {
    return null;
  }

  const getAdherenceColor = (rate: number) => {
    if (rate >= 90) return theme.palette.success.main;
    if (rate >= 70) return theme.palette.warning.main;
    return theme.palette.error.main;
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Medication Adherence
        </Typography>
        
        <Box display="flex" justifyContent="center" alignItems="center" my={2}>
          <Box position="relative" display="inline-flex">
            <CircularProgress
              variant="determinate"
              value={metrics.adherenceRate}
              size={80}
              thickness={4}
              sx={{ color: getAdherenceColor(metrics.adherenceRate) }}
            />
            <Box
              position="absolute"
              top={0}
              left={0}
              bottom={0}
              right={0}
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Typography variant="body2" component="div" color="text.secondary">
                {`${Math.round(metrics.adherenceRate)}%`}
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box mt={2}>
          <Typography variant="body2" color="text.secondary">
            Doses Taken: {metrics.takenCount}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Doses Missed: {metrics.missedCount}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Doses Skipped: {metrics.skippedCount}
          </Typography>
          {metrics.lastTaken && (
            <Typography variant="body2" color="text.secondary">
              Last Taken: {format(new Date(metrics.lastTaken), 'MMM dd, yyyy HH:mm')}
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default AdherenceCard;
