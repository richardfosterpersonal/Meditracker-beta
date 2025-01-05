import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  Grid,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
} from '@mui/lab';
import {
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
} from '@mui/icons-material';

interface MonitoringMetrics {
  userCount: number;
  activeUsers: number;
  safetyScore: number;
  criticalPathCompliance: number;
  systemHealth: 'healthy' | 'degraded' | 'critical';
  recentIncidents: Array<{
    id: string;
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    timestamp: string;
    status: 'open' | 'resolved';
  }>;
  userProgress: Array<{
    userId: string;
    name: string;
    stage: string;
    safetyScore: number;
    lastActive: string;
    criticalPathStatus: 'compliant' | 'warning' | 'violation';
  }>;
}

const BetaMonitoringDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<MonitoringMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/beta/monitoring/metrics');
      if (!response.ok) throw new Error('Failed to fetch metrics');
      const data = await response.json();
      setMetrics(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!metrics) return null;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Beta Monitoring Dashboard
      </Typography>

      {/* System Health Overview */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
          <Card sx={{ p: 2 }}>
            <Typography variant="subtitle2" color="textSecondary">
              System Health
            </Typography>
            <Box display="flex" alignItems="center" mt={1}>
              {metrics.systemHealth === 'healthy' ? (
                <CheckCircleIcon color="success" />
              ) : metrics.systemHealth === 'degraded' ? (
                <WarningIcon color="warning" />
              ) : (
                <ErrorIcon color="error" />
              )}
              <Typography variant="h6" sx={{ ml: 1 }}>
                {metrics.systemHealth.toUpperCase()}
              </Typography>
            </Box>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card sx={{ p: 2 }}>
            <Typography variant="subtitle2" color="textSecondary">
              Safety Score
            </Typography>
            <Typography variant="h6">
              {metrics.safetyScore.toFixed(1)}%
            </Typography>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card sx={{ p: 2 }}>
            <Typography variant="subtitle2" color="textSecondary">
              Critical Path Compliance
            </Typography>
            <Typography variant="h6">
              {metrics.criticalPathCompliance.toFixed(1)}%
            </Typography>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card sx={{ p: 2 }}>
            <Typography variant="subtitle2" color="textSecondary">
              Active Users
            </Typography>
            <Typography variant="h6">
              {metrics.activeUsers} / {metrics.userCount}
            </Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Incidents */}
      <Card sx={{ mb: 4 }}>
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Recent Incidents
          </Typography>
          <Timeline>
            {metrics.recentIncidents.map((incident) => (
              <TimelineItem key={incident.id}>
                <TimelineSeparator>
                  <TimelineDot
                    color={
                      incident.severity === 'critical'
                        ? 'error'
                        : incident.severity === 'high'
                        ? 'warning'
                        : 'info'
                    }
                  />
                  <TimelineConnector />
                </TimelineSeparator>
                <TimelineContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Typography variant="body1">{incident.type}</Typography>
                    <Chip
                      label={incident.status}
                      color={incident.status === 'resolved' ? 'success' : 'warning'}
                      size="small"
                    />
                  </Box>
                  <Typography variant="caption" color="textSecondary">
                    {new Date(incident.timestamp).toLocaleString()}
                  </Typography>
                </TimelineContent>
              </TimelineItem>
            ))}
          </Timeline>
        </Box>
      </Card>

      {/* User Progress Table */}
      <Card>
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            User Progress
          </Typography>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>User</TableCell>
                <TableCell>Stage</TableCell>
                <TableCell>Safety Score</TableCell>
                <TableCell>Last Active</TableCell>
                <TableCell>Critical Path Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {metrics.userProgress.map((user) => (
                <TableRow key={user.userId}>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.stage}</TableCell>
                  <TableCell>{user.safetyScore}%</TableCell>
                  <TableCell>
                    {new Date(user.lastActive).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={user.criticalPathStatus}
                      color={
                        user.criticalPathStatus === 'compliant'
                          ? 'success'
                          : user.criticalPathStatus === 'warning'
                          ? 'warning'
                          : 'error'
                      }
                      size="small"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      </Card>
    </Box>
  );
};

export default BetaMonitoringDashboard;
