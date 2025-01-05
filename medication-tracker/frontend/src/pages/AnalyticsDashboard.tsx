import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Select,
  MenuItem,
  Box,
  CircularProgress
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { format } from 'date-fns';
import { useAnalytics } from '../hooks/useAnalytics';
import { TimeRange } from '../types/analytics';
import AdherenceCard from '../components/analytics/AdherenceCard';
import RefillCard from '../components/analytics/RefillCard';
import InteractionCard from '../components/analytics/InteractionCard';
import SystemMetricsCard from '../components/analytics/SystemMetricsCard';

const AnalyticsDashboard: React.FC = () => {
  const theme = useTheme();
  const [timeRange, setTimeRange] = useState<TimeRange>(TimeRange.WEEK);
  const {
    adherenceMetrics,
    refillMetrics,
    interactionMetrics,
    systemMetrics,
    loading,
    error
  } = useAnalytics(timeRange);

  const COLORS = [
    theme.palette.primary.main,
    theme.palette.secondary.main,
    theme.palette.error.main,
    theme.palette.warning.main
  ];

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <Typography color="error">
          Error loading analytics data: {error.message}
        </Typography>
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" mb={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Analytics Dashboard
        </Typography>
        <Select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value as TimeRange)}
          variant="outlined"
          size="small"
        >
          <MenuItem value={TimeRange.HOUR}>Last Hour</MenuItem>
          <MenuItem value={TimeRange.DAY}>Last 24 Hours</MenuItem>
          <MenuItem value={TimeRange.WEEK}>Last 7 Days</MenuItem>
          <MenuItem value={TimeRange.MONTH}>Last 30 Days</MenuItem>
          <MenuItem value={TimeRange.YEAR}>Last Year</MenuItem>
        </Select>
      </Box>

      <Grid container spacing={3}>
        {/* Adherence Metrics */}
        <Grid item xs={12} md={6} lg={3}>
          <AdherenceCard metrics={adherenceMetrics} />
        </Grid>

        {/* Refill Metrics */}
        <Grid item xs={12} md={6} lg={3}>
          <RefillCard metrics={refillMetrics} />
        </Grid>

        {/* Interaction Metrics */}
        <Grid item xs={12} md={6} lg={3}>
          <InteractionCard metrics={interactionMetrics} />
        </Grid>

        {/* System Metrics */}
        <Grid item xs={12} md={6} lg={3}>
          <SystemMetricsCard metrics={systemMetrics} />
        </Grid>

        {/* Adherence Trend */}
        <Grid item xs={12} lg={8}>
          <Paper
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              height: 400
            }}
          >
            <Typography variant="h6" gutterBottom>
              Adherence Trend
            </Typography>
            <ResponsiveContainer>
              <LineChart
                data={adherenceMetrics?.data || []}
                margin={{
                  top: 16,
                  right: 16,
                  bottom: 0,
                  left: 24
                }}
              >
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(time) => format(new Date(time), 'MM/dd')}
                />
                <YAxis />
                <CartesianGrid strokeDasharray="3 3" />
                <Tooltip
                  formatter={(value: number) => `${value.toFixed(1)}%`}
                  labelFormatter={(label) =>
                    format(new Date(label), 'MMM dd, yyyy')
                  }
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={theme.palette.primary.main}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Distribution Chart */}
        <Grid item xs={12} lg={4}>
          <Paper
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              height: 400
            }}
          >
            <Typography variant="h6" gutterBottom>
              Medication Distribution
            </Typography>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={[
                    {
                      name: 'Taken',
                      value: adherenceMetrics?.takenCount || 0
                    },
                    {
                      name: 'Missed',
                      value: adherenceMetrics?.missedCount || 0
                    },
                    {
                      name: 'Skipped',
                      value: adherenceMetrics?.skippedCount || 0
                    }
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {adherenceMetrics?.data.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default AnalyticsDashboard;
