import React, { useEffect, useState } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  Alert,
  useTheme,
  Select,
  MenuItem,
  FormControl,
  Tab,
  Tabs,
} from '@mui/material';
import { api } from '../../services/api';
import { useAnalytics } from '../../hooks/useAnalytics';
import { AdherenceChart } from './AdherenceChart';
import { FamilyActivityCard } from './FamilyActivityCard';
import { SystemHealthCard } from './SystemHealthCard';

interface AnalyticsData {
  adherenceData: {
    date: string;
    adherenceRate: number;
    missedDoses: number;
    totalDoses: number;
  }[];
  familyActivity: {
    userId: string;
    userName: string;
    activityCount: number;
    adherenceRate: number;
    lastActive: string;
  }[];
  systemHealth: {
    metrics: {
      name: string;
      value: number;
      threshold: number;
      unit: string;
    }[];
    lastUpdated: string;
  };
  complianceByMedication: {
    medicationName: string;
    compliance: number;
    totalDoses: number;
    missedDoses: number;
  }[];
  missedDoseReasons: {
    reason: string;
    count: number;
  }[];
  timeOfDayDistribution: {
    timeSlot: string;
    count: number;
    compliance: number;
  }[];
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`analytics-tabpanel-${index}`}
      aria-labelledby={`analytics-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export const AnalyticsDashboard: React.FC = () => {
  const theme = useTheme();
  const { trackEvent } = useAnalytics();
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('7d');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    trackEvent('analytics_dashboard_viewed', { timeRange });
  }, [timeRange, trackEvent]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const response = await api.get('/api/analytics/dashboard', {
          params: { timeRange }
        });
        setAnalyticsData(response.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching analytics data:', err);
        setError('Failed to load analytics data');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [timeRange]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    trackEvent('analytics_tab_changed', { tabIndex: newValue });
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!analyticsData) return null;

  return (
    <Box>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Grid container justifyContent="space-between" alignItems="center">
          <Grid item>
            <Tabs value={tabValue} onChange={handleTabChange}>
              <Tab label="Overview" />
              <Tab label="Family Activity" />
              <Tab label="Detailed Analysis" />
            </Tabs>
          </Grid>
          <Grid item>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <Select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as '7d' | '30d' | '90d')}
              >
                <MenuItem value="7d">Last 7 Days</MenuItem>
                <MenuItem value="30d">Last 30 Days</MenuItem>
                <MenuItem value="90d">Last 90 Days</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <AdherenceChart
              data={analyticsData.adherenceData}
              timeRange={timeRange}
            />
          </Grid>
          <Grid item xs={12}>
            <SystemHealthCard
              metrics={analyticsData.systemHealth.metrics}
              lastUpdated={analyticsData.systemHealth.lastUpdated}
            />
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <FamilyActivityCard
              activities={analyticsData.familyActivity}
            />
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Compliance by Medication
                </Typography>
                <Box height={400}>
                  <ResponsiveContainer>
                    <BarChart
                      layout="vertical"
                      data={analyticsData.complianceByMedication}
                      margin={{ left: 100 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                      <YAxis type="category" dataKey="medicationName" />
                      <Tooltip formatter={(value: number) => [`${value}%`, 'Compliance']} />
                      <Legend />
                      <Bar dataKey="compliance" fill={theme.palette.primary.main} name="Compliance" />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Time of Day Distribution
                </Typography>
                <Box height={400}>
                  <ResponsiveContainer>
                    <BarChart data={analyticsData.timeOfDayDistribution}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="timeSlot" />
                      <YAxis yAxisId="left" />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        domain={[0, 100]}
                        tickFormatter={(value) => `${value}%`}
                      />
                      <Tooltip
                        formatter={(value: number, name: string) => {
                          if (name === 'compliance') return [`${value}%`, 'Compliance'];
                          return [value, 'Doses'];
                        }}
                      />
                      <Legend />
                      <Bar
                        yAxisId="left"
                        dataKey="count"
                        fill={theme.palette.primary.main}
                        name="Number of Doses"
                      />
                      <Bar
                        yAxisId="right"
                        dataKey="compliance"
                        fill={theme.palette.secondary.main}
                        name="Compliance Rate"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>
    </Box>
  );
};
