import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
} from '@mui/material';
import { 
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
} from '@mui/lab';
import { monitoring } from '../../services/monitoring/MonitoringService';
import { logging, LogEntry } from '../../services/monitoring/LoggingService';
import { usePerformanceMonitoring } from '../../hooks/usePerformanceMonitoring';

const MonitoringDashboard: React.FC = () => {
  const [performanceMetrics, setPerformanceMetrics] = useState(monitoring.getPerformanceMetrics());
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { trackInteraction, measureAsyncOperation } = usePerformanceMonitoring({
    componentName: 'MonitoringDashboard',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        await measureAsyncOperation('fetchInitialData', async () => {
          setPerformanceMetrics(monitoring.getPerformanceMetrics());
          setLogs(logging.getLogBuffer());
          setIsLoading(false);
        });
      } catch (error) {
        logging.error('Failed to fetch monitoring data', { context: { error } });
      }
    };

    fetchData();

    const interval = setInterval(() => {
      setPerformanceMetrics(monitoring.getPerformanceMetrics());
      setLogs(logging.getLogBuffer());
    }, 5000);

    return () => clearInterval(interval);
  }, [measureAsyncOperation]);

  const handleMetricClick = (metric: string) => {
    const cleanup = trackInteraction('selectMetric');
    setSelectedMetric(selectedMetric === metric ? null : metric);
    cleanup?.();
  };

  const handleDownloadLogs = () => {
    const cleanup = trackInteraction('downloadLogs');
    logging.downloadLogs();
    cleanup?.();
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  const getMetricStatus = (name: string, value: number): 'success' | 'warning' | 'error' => {
    const thresholds = {
      fcp: { warning: 1800, error: 3000 },
      lcp: { warning: 2500, error: 4000 },
      fid: { warning: 100, error: 300 },
      cls: { warning: 0.1, error: 0.25 },
      ttfb: { warning: 600, error: 1000 },
    };

    const metric = thresholds[name as keyof typeof thresholds];
    if (!metric) return 'success';

    if (value >= metric.error) return 'error';
    if (value >= metric.warning) return 'warning';
    return 'success';
  };

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Monitoring Dashboard
      </Typography>

      <Grid container spacing={3}>
        {/* Performance Metrics */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Performance Metrics
              </Typography>
              <Grid container spacing={2}>
                {Object.entries(performanceMetrics).map(([key, value]) => {
                  const status = getMetricStatus(key, value);
                  return (
                    <Grid item xs={6} key={key}>
                      <Card 
                        variant="outlined"
                        onClick={() => handleMetricClick(key)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <CardContent>
                          <Typography color="textSecondary" gutterBottom>
                            {key.toUpperCase()}
                          </Typography>
                          <Typography variant="h5" component="h2">
                            {value.toFixed(2)}
                          </Typography>
                          <Alert severity={status} sx={{ mt: 1 }}>
                            {status === 'success' ? 'Good' : status === 'warning' ? 'Warning' : 'Poor'}
                          </Alert>
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Logs */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Recent Logs</Typography>
                <Button variant="outlined" onClick={handleDownloadLogs}>
                  Download Logs
                </Button>
              </Box>
              <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Time</TableCell>
                      <TableCell>Level</TableCell>
                      <TableCell>Message</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {logs.slice(-10).map((log, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </TableCell>
                        <TableCell>
                          <Typography
                            color={
                              log.level === 'error'
                                ? 'error'
                                : log.level === 'warn'
                                ? 'warning'
                                : 'textPrimary'
                            }
                          >
                            {log.level}
                          </Typography>
                        </TableCell>
                        <TableCell>{log.message}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Timeline */}
        {selectedMetric && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {selectedMetric.toUpperCase()} Timeline
                </Typography>
                <Timeline>
                  {logs
                    .filter(log => log.context?.metric === selectedMetric)
                    .map((log, index) => (
                      <TimelineItem key={index}>
                        <TimelineSeparator>
                          <TimelineDot color={
                            log.level === 'error'
                              ? 'error'
                              : log.level === 'warn'
                              ? 'warning'
                              : 'primary'
                          } />
                          <TimelineConnector />
                        </TimelineSeparator>
                        <TimelineContent>
                          <Typography variant="body2" color="textSecondary">
                            {new Date(log.timestamp).toLocaleString()}
                          </Typography>
                          <Typography>{log.message}</Typography>
                          {log.context && (
                            <Typography variant="body2" color="textSecondary">
                              {JSON.stringify(log.context)}
                            </Typography>
                          )}
                        </TimelineContent>
                      </TimelineItem>
                    ))}
                </Timeline>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default MonitoringDashboard;
