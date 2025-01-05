import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  useTheme
} from '@mui/material';
import { RefillMetrics } from '../../types/analytics';
import { format, formatDistanceToNow } from 'date-fns';

interface RefillCardProps {
  metrics: RefillMetrics | null;
}

const RefillCard: React.FC<RefillCardProps> = ({ metrics }) => {
  const theme = useTheme();

  if (!metrics) {
    return null;
  }

  const daysUntilRefill = metrics.predictedNextRefill
    ? Math.ceil((new Date(metrics.predictedNextRefill).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const getRefillStatus = () => {
    if (!daysUntilRefill) return { color: theme.palette.grey[500], text: 'No prediction available' };
    if (daysUntilRefill <= 3) return { color: theme.palette.error.main, text: 'Refill needed soon' };
    if (daysUntilRefill <= 7) return { color: theme.palette.warning.main, text: 'Plan refill soon' };
    return { color: theme.palette.success.main, text: 'Refill not needed yet' };
  };

  const status = getRefillStatus();

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Medication Refills
        </Typography>

        <Box mt={2}>
          <Typography variant="body2" color="text.secondary">
            Total Refills: {metrics.refillCount}
          </Typography>
          {metrics.lastRefill && (
            <Typography variant="body2" color="text.secondary">
              Last Refill: {format(new Date(metrics.lastRefill), 'MMM dd, yyyy')}
            </Typography>
          )}
          {metrics.averageRefillInterval > 0 && (
            <Typography variant="body2" color="text.secondary">
              Average Interval:{' '}
              {formatDistanceToNow(Date.now() - metrics.averageRefillInterval)}
            </Typography>
          )}
        </Box>

        {metrics.predictedNextRefill && (
          <Box mt={3}>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mb: 1 }}
            >
              Next Refill: {format(new Date(metrics.predictedNextRefill), 'MMM dd, yyyy')}
            </Typography>
            <LinearProgress
              variant="determinate"
              value={Math.min((daysUntilRefill! / 30) * 100, 100)}
              sx={{
                height: 8,
                borderRadius: 4,
                backgroundColor: theme.palette.grey[200],
                '& .MuiLinearProgress-bar': {
                  backgroundColor: status.color,
                  borderRadius: 4
                }
              }}
            />
            <Typography
              variant="caption"
              sx={{ color: status.color, mt: 1, display: 'block' }}
            >
              {status.text}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default RefillCard;
