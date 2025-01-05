import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  Tooltip,
  useTheme
} from '@mui/material';
import { SystemMetrics } from '../../types/analytics';

interface SystemMetricsCardProps {
  metrics: SystemMetrics | null;
}

const SystemMetricsCard: React.FC<SystemMetricsCardProps> = ({ metrics }) => {
  const theme = useTheme();

  if (!metrics) {
    return null;
  }

  const getMetricColor = (value: number, threshold: number) => {
    const ratio = value / threshold;
    if (ratio <= 0.7) return theme.palette.success.main;
    if (ratio <= 0.9) return theme.palette.warning.main;
    return theme.palette.error.main;
  };

  const formatResponseTime = (time: number) => {
    if (time < 1000) return `${time.toFixed(0)}ms`;
    return `${(time / 1000).toFixed(1)}s`;
  };

  const MetricItem = ({
    label,
    value,
    threshold,
    unit
  }: {
    label: string;
    value: number;
    threshold: number;
    unit: string;
  }) => (
    <Box mb={2}>
      <Box display="flex" justifyContent="space-between" mb={0.5}>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {unit === 'ms' ? formatResponseTime(value) : `${value}${unit}`}
        </Typography>
      </Box>
      <Tooltip
        title={`Threshold: ${unit === 'ms' ? formatResponseTime(threshold) : `${threshold}${unit}`}`}
        arrow
      >
        <LinearProgress
          variant="determinate"
          value={(value / threshold) * 100}
          sx={{
            height: 6,
            borderRadius: 3,
            backgroundColor: theme.palette.grey[200],
            '& .MuiLinearProgress-bar': {
              backgroundColor: getMetricColor(value, threshold),
              borderRadius: 3
            }
          }}
        />
      </Tooltip>
    </Box>
  );

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          System Health
        </Typography>

        <Box mt={3}>
          <MetricItem
            label="Avg Response Time"
            value={metrics.averageResponseTime}
            threshold={1000}
            unit="ms"
          />

          <MetricItem
            label="P95 Response Time"
            value={metrics.p95ResponseTime}
            threshold={2000}
            unit="ms"
          />

          <MetricItem
            label="Error Rate"
            value={metrics.errorRate}
            threshold={5}
            unit="%"
          />
        </Box>

        <Box mt={3}>
          <Typography variant="body2" color="text.secondary">
            Active Users: {metrics.uniqueUsers}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Total Events: {metrics.totalEvents}
          </Typography>
        </Box>

        <Box
          mt={2}
          p={1}
          bgcolor={theme.palette.grey[100]}
          borderRadius={1}
        >
          <Typography variant="caption" color="text.secondary">
            {metrics.errorRate <= 1
              ? '✅ System operating normally'
              : metrics.errorRate <= 5
              ? '⚠️ Minor system issues detected'
              : '❌ System requires attention'}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default SystemMetricsCard;
