import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  useTheme
} from '@mui/material';
import {
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { InteractionMetrics } from '../../types/analytics';
import { formatDistanceToNow } from 'date-fns';

interface InteractionCardProps {
  metrics: InteractionMetrics | null;
}

const InteractionCard: React.FC<InteractionCardProps> = ({ metrics }) => {
  const theme = useTheme();

  if (!metrics) {
    return null;
  }

  const getResolutionRateColor = (rate: number) => {
    if (rate >= 90) return theme.palette.success.main;
    if (rate >= 70) return theme.palette.warning.main;
    return theme.palette.error.main;
  };

  const resolutionRate = metrics.resolvedCount / metrics.totalInteractions * 100;

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Medication Interactions
        </Typography>

        <Box mt={2}>
          <List dense>
            <ListItem>
              <ListItemIcon>
                <WarningIcon color="warning" />
              </ListItemIcon>
              <ListItemText
                primary="Total Interactions"
                secondary={metrics.totalInteractions}
              />
            </ListItem>

            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon sx={{ color: theme.palette.success.main }} />
              </ListItemIcon>
              <ListItemText
                primary="Resolved"
                secondary={metrics.resolvedCount}
              />
            </ListItem>

            <ListItem>
              <ListItemIcon>
                <CancelIcon color="error" />
              </ListItemIcon>
              <ListItemText
                primary="Ignored"
                secondary={metrics.ignoredCount}
              />
            </ListItem>
          </List>
        </Box>

        <Box mt={2}>
          <Typography
            variant="body2"
            sx={{ color: getResolutionRateColor(resolutionRate) }}
          >
            Resolution Rate: {resolutionRate.toFixed(1)}%
          </Typography>
          
          {metrics.averageResolutionTime > 0 && (
            <Typography variant="body2" color="text.secondary">
              Avg. Resolution Time:{' '}
              {formatDistanceToNow(Date.now() - metrics.averageResolutionTime)}
            </Typography>
          )}
        </Box>

        {metrics.totalInteractions > 0 && (
          <Box
            mt={2}
            p={1}
            bgcolor={theme.palette.grey[100]}
            borderRadius={1}
          >
            <Typography variant="caption" color="text.secondary">
              {metrics.resolvedCount === metrics.totalInteractions
                ? '✅ All interactions resolved'
                : `⚠️ ${metrics.totalInteractions - metrics.resolvedCount} interactions need attention`}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default InteractionCard;
