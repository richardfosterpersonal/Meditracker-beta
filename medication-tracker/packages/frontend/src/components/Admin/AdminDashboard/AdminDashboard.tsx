import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  CircularProgress,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import axios from 'axios';

interface HealthData {
  status: string;
  uptime: number;
  memory: {
    used: number;
    total: number;
  };
  cpu: number;
}

interface PerformanceData {
  responseTime: number;
  errorRate: number;
  requestsPerMinute: number;
}

interface UserActivity {
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  metadata: Record<string, unknown>;
}

interface PerformanceHistoryEntry {
  timestamp: string;
  responseTime: number;
  errorRate: number;
  requestsPerMinute: number;
}

const AdminDashboard: React.FC = () => {
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
  const [userActivity, setUserActivity] = useState<UserActivity | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [performanceHistory, setPerformanceHistory] = useState<PerformanceHistoryEntry[]>([]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [healthRes, perfRes, activityRes, logsRes] = await Promise.all([
        axios.get<HealthData>('/api/admin/health', { headers }),
        axios.get<PerformanceData>('/api/admin/performance', { headers }),
        axios.get<UserActivity>('/api/admin/users/activity', { headers }),
        axios.get<LogEntry[]>('/api/admin/logs', { headers }),
      ]);

      setHealthData(healthRes.data);
      setPerformanceData(perfRes.data);
      setUserActivity(activityRes.data);
      setLogs(logsRes.data);

      // Fetch historical performance data
      const historyRes = await axios.get<PerformanceHistoryEntry[]>('/api/admin/performance/history', { headers });
      setPerformanceHistory(historyRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while fetching data');
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!healthData || !performanceData || !userActivity) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Admin Dashboard
      </Typography>

      <Grid container spacing={3}>
        {/* System Health */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                System Health
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography color="textSecondary">Status</Typography>
                  <Typography variant="h6">{healthData.status}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography color="textSecondary">Uptime</Typography>
                  <Typography variant="h6">{Math.floor(healthData.uptime / 3600)}h</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography color="textSecondary">Memory Usage</Typography>
                  <Typography variant="h6">
                    {Math.round((healthData.memory.used / healthData.memory.total) * 100)}%
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography color="textSecondary">CPU Load</Typography>
                  <Typography variant="h6">{Math.round(healthData.cpu * 100)}%</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Performance Metrics */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Performance Metrics
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography color="textSecondary">Response Time</Typography>
                  <Typography variant="h6">{performanceData.responseTime}ms</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography color="textSecondary">Error Rate</Typography>
                  <Typography variant="h6">{performanceData.errorRate}%</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography color="textSecondary">Requests/min</Typography>
                  <Typography variant="h6">{performanceData.requestsPerMinute}</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Performance History Chart */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Performance History
              </Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={performanceHistory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="responseTime"
                      stroke="#8884d8"
                      name="Response Time (ms)"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="errorRate"
                      stroke="#82ca9d"
                      name="Error Rate (%)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* User Activity */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                User Activity
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <Typography color="textSecondary">Total Users</Typography>
                  <Typography variant="h6">{userActivity.totalUsers}</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography color="textSecondary">Active Users</Typography>
                  <Typography variant="h6">{userActivity.activeUsers}</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography color="textSecondary">New Users</Typography>
                  <Typography variant="h6">{userActivity.newUsers}</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* System Logs */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">System Logs</Typography>
                <Button variant="outlined" onClick={fetchData}>
                  Refresh
                </Button>
              </Box>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Timestamp</TableCell>
                      <TableCell>Level</TableCell>
                      <TableCell>Message</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {logs.map((log, index) => (
                      <TableRow key={index}>
                        <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                        <TableCell>{log.level}</TableCell>
                        <TableCell>{log.message}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AdminDashboard;
