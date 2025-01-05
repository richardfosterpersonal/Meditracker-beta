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
  LinearProgress,
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Info as InfoIcon,
  LocalHospital as MedicationIcon,
  CheckCircle as ComplianceIcon,
  Schedule as ScheduleIcon,
  Notifications as NotificationIcon,
} from '@mui/icons-material';
import { api } from '../../services/api';

interface StatCard {
  title: string;
  value: string | number;
  trend?: number;
  icon: React.ReactNode;
  color: string;
  tooltip: string;
}

interface UserStatistics {
  overallCompliance: number;
  totalMedications: number;
  upcomingDoses: number;
  missedDoses: number;
  complianceTrend: number;
  activeNotifications: number;
  streakDays: number;
}

export const UserStats: React.FC = () => {
  const theme = useTheme();
  const [stats, setStats] = useState<UserStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/api/v1/users/statistics');
        setStats({
          overallCompliance: response.data.overall_compliance,
          totalMedications: response.data.total_medications,
          upcomingDoses: response.data.upcoming_doses,
          missedDoses: response.data.missed_doses,
          complianceTrend: response.data.compliance_trend,
          activeNotifications: response.data.active_notifications,
          streakDays: response.data.streak_days,
        });
        setError(null);
      } catch (err) {
        console.error('Error fetching user statistics:', err);
        setError('Failed to load statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    // Refresh stats every 5 minutes
    const interval = setInterval(fetchStats, 300000);
    return () => clearInterval(interval);
  }, []);

  const getStatCards = (stats: UserStatistics): StatCard[] => [
    {
      title: 'Overall Compliance',
      value: `${stats.overallCompliance}%`,
      trend: stats.complianceTrend,
      icon: <ComplianceIcon />,
      color: theme.palette.primary.main,
      tooltip: 'Percentage of medications taken on time in the last 30 days'
    },
    {
      title: 'Active Medications',
      value: stats.totalMedications,
      icon: <MedicationIcon />,
      color: theme.palette.secondary.main,
      tooltip: 'Number of currently active medications'
    },
    {
      title: 'Upcoming Doses',
      value: stats.upcomingDoses,
      icon: <ScheduleIcon />,
      color: theme.palette.info.main,
      tooltip: 'Number of doses scheduled for the next 24 hours'
    },
    {
      title: 'Current Streak',
      value: `${stats.streakDays} days`,
      icon: <TrendingUpIcon />,
      color: theme.palette.success.main,
      tooltip: 'Consecutive days of perfect medication compliance'
    }
  ];

  const StatCardComponent: React.FC<{ stat: StatCard }> = ({ stat }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box sx={{ color: stat.color }}>
            {stat.icon}
          </Box>
          <Tooltip title={stat.tooltip}>
            <IconButton size="small">
              <InfoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        <Typography variant="h4" component="div" sx={{ mt: 2, mb: 1 }}>
          {stat.value}
        </Typography>

        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="body2" color="text.secondary">
            {stat.title}
          </Typography>
          {stat.trend !== undefined && (
            <Box display="flex" alignItems="center" gap={0.5}>
              {stat.trend >= 0 ? (
                <TrendingUpIcon sx={{ color: theme.palette.success.main }} />
              ) : (
                <TrendingDownIcon sx={{ color: theme.palette.error.main }} />
              )}
              <Typography
                variant="body2"
                color={stat.trend >= 0 ? 'success.main' : 'error.main'}
              >
                {Math.abs(stat.trend)}%
              </Typography>
            </Box>
          )}
        </Box>

        {stat.title === 'Overall Compliance' && (
          <Box sx={{ mt: 2 }}>
            <LinearProgress
              variant="determinate"
              value={stats.overallCompliance}
              sx={{
                height: 8,
                borderRadius: 4,
                backgroundColor: theme.palette.grey[200],
                '& .MuiLinearProgress-bar': {
                  borderRadius: 4,
                  backgroundColor: getComplianceColor(stats.overallCompliance),
                },
              }}
            />
          </Box>
        )}
      </CardContent>
    </Card>
  );

  const getComplianceColor = (compliance: number): string => {
    if (compliance >= 90) return theme.palette.success.main;
    if (compliance >= 75) return theme.palette.warning.main;
    return theme.palette.error.main;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
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

  if (!stats) return null;

  return (
    <Grid container spacing={3}>
      {getStatCards(stats).map((stat, index) => (
        <Grid item xs={12} sm={6} md={3} key={index}>
          <StatCardComponent stat={stat} />
        </Grid>
      ))}

      {/* Additional Summary Card */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="h6" gutterBottom>
                  Today's Summary
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {stats.missedDoses > 0 ? (
                    <span style={{ color: theme.palette.error.main }}>
                      {stats.missedDoses} missed dose{stats.missedDoses !== 1 ? 's' : ''}
                    </span>
                  ) : (
                    "You're doing great! No missed doses today."
                  )}
                </Typography>
              </Box>
              <Box display="flex" alignItems="center" gap={1}>
                <NotificationIcon color="action" />
                <Typography variant="body2" color="text.secondary">
                  {stats.activeNotifications} active notification{stats.activeNotifications !== 1 ? 's' : ''}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};
