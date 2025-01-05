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

const AdminDashboard = () => {
  const [healthData, setHealthData] = useState(null);
  const [performanceData, setPerformanceData] = useState(null);
  const [userActivity, setUserActivity] = useState(null);
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState(null);
  const [performanceHistory, setPerformanceHistory] = useState([]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [healthRes, perfRes, activityRes, logsRes] = await Promise.all([
        axios.get('/api/admin/health', { headers }),
        axios.get('/api/admin/performance', { headers }),
        axios.get('/api/admin/users/activity', { headers }),
        axios.get('/api/admin/logs', { headers }),
      ]);

      setHealthData(healthRes.data);
      setPerformanceData(perfRes.data);
      setUserActivity(activityRes.data);
      setLogs(logsRes.data.logs);

      // Add to performance history
      setPerformanceHistory(prev => [...prev, {
        timestamp: new Date().toLocaleTimeString(),
        cpu: perfRes.data.cpu.total_usage,
        memory: perfRes.data.memory.percent_used,
      }].slice(-20)); // Keep last 20 data points

      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Error fetching data');
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const optimizeDatabase = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/admin/maintenance/vacuum', null, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Error optimizing database');
    }
  };

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (!healthData || !performanceData || !userActivity) {
    return <CircularProgress />;
  }

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Admin Dashboard
      </Typography>

      {/* System Health */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6">CPU Usage</Typography>
              <CircularProgress
                variant="determinate"
                value={performanceData.cpu.total_usage}
                size={80}
              />
              <Typography>
                {performanceData.cpu.total_usage.toFixed(1)}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6">Memory Usage</Typography>
              <CircularProgress
                variant="determinate"
                value={performanceData.memory.percent_used}
                size={80}
              />
              <Typography>
                {performanceData.memory.percent_used.toFixed(1)}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6">Disk Usage</Typography>
              <CircularProgress
                variant="determinate"
                value={performanceData.disk.percent_used}
                size={80}
              />
              <Typography>
                {performanceData.disk.percent_used.toFixed(1)}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Performance Chart */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Performance History
          </Typography>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={performanceHistory}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="cpu"
                stroke="#8884d8"
                name="CPU Usage %"
              />
              <Line
                type="monotone"
                dataKey="memory"
                stroke="#82ca9d"
                name="Memory Usage %"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* User Activity */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            User Activity
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography>
                Total Users: {userActivity.user_stats.total_users}
              </Typography>
              <Typography>
                Active Users (7d): {userActivity.user_stats.active_users_7d}
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography>
                Total Medications: {userActivity.activity_summary.total_medications}
              </Typography>
              <Typography>
                Total Schedules: {userActivity.activity_summary.total_schedules}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Database Info */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Database Information
          </Typography>
          <Typography>
            Size: {healthData.database.size_mb.toFixed(2)} MB
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={optimizeDatabase}
            sx={{ mt: 2 }}
          >
            Optimize Database
          </Button>
        </CardContent>
      </Card>

      {/* Logs */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Recent Logs
          </Typography>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Timestamp</TableCell>
                  <TableCell>Message</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.map((log, index) => (
                  <TableRow key={index}>
                    <TableCell>{log.split(' - ')[0]}</TableCell>
                    <TableCell>{log.split(' - ').slice(1).join(' - ')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
};

export default AdminDashboard;
