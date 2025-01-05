import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  useTheme,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  PlayArrow as PlayArrowIcon,
  Stop as StopIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { DateTime } from 'luxon';
import axios from 'axios';

interface JobStatus {
  jobName: string;
  exists: boolean;
  running?: boolean;
  lastDate?: string;
  nextDate?: string;
}

interface JobHistory {
  id: string;
  jobName: string;
  status: string;
  startedAt: string;
  completedAt?: string;
  error?: string;
  metadata?: any;
}

export const JobMonitoring: React.FC = () => {
  const theme = useTheme();
  const [jobStatuses, setJobStatuses] = useState<JobStatus[]>([]);
  const [jobHistory, setJobHistory] = useState<JobHistory[]>([]);
  const [selectedJob, setSelectedJob] = useState<JobHistory | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [statusRes, historyRes] = await Promise.all([
        axios.get('/api/admin/jobs/status'),
        axios.get('/api/admin/jobs/history')
      ]);
      setJobStatuses(statusRes.data);
      setJobHistory(historyRes.data);
    } catch (err) {
      setError('Failed to load job data');
      console.error('Error loading job data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerJob = async (jobName: string) => {
    try {
      setLoading(true);
      setError(null);
      await axios.post(`/api/admin/jobs/trigger/${jobName}`);
      await loadData();
    } catch (err) {
      setError(`Failed to trigger job: ${jobName}`);
      console.error('Error triggering job:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStopJobs = async () => {
    try {
      setLoading(true);
      setError(null);
      await axios.post('/api/admin/jobs/stop');
      await loadData();
    } catch (err) {
      setError('Failed to stop jobs');
      console.error('Error stopping jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusChip = (status: string) => {
    const statusColors: Record<string, 'default' | 'primary' | 'success' | 'error'> = {
      running: 'primary',
      completed: 'success',
      failed: 'error',
    };

    return (
      <Chip
        label={status.charAt(0).toUpperCase() + status.slice(1)}
        color={statusColors[status] || 'default'}
        size="small"
      />
    );
  };

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Job Status Overview */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Job Status</Typography>
                <Box>
                  <Button
                    startIcon={<RefreshIcon />}
                    onClick={loadData}
                    disabled={loading}
                    sx={{ mr: 1 }}
                  >
                    Refresh
                  </Button>
                  <Button
                    startIcon={<StopIcon />}
                    color="error"
                    onClick={handleStopJobs}
                    disabled={loading}
                  >
                    Stop All Jobs
                  </Button>
                </Box>
              </Box>

              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Job Name</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Last Run</TableCell>
                      <TableCell>Next Run</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {jobStatuses.map((job) => (
                      <TableRow key={job.jobName}>
                        <TableCell>{job.jobName}</TableCell>
                        <TableCell>
                          {getStatusChip(job.running ? 'running' : 'idle')}
                        </TableCell>
                        <TableCell>
                          {job.lastDate
                            ? DateTime.fromISO(job.lastDate).toRelative()
                            : 'Never'}
                        </TableCell>
                        <TableCell>
                          {job.nextDate
                            ? DateTime.fromISO(job.nextDate).toRelative()
                            : 'Not scheduled'}
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            onClick={() => handleTriggerJob(job.jobName)}
                            disabled={job.running || loading}
                          >
                            <PlayArrowIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Job History */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Job History
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Job Name</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Started</TableCell>
                      <TableCell>Duration</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {jobHistory.map((job) => (
                      <TableRow key={job.id}>
                        <TableCell>{job.jobName}</TableCell>
                        <TableCell>{getStatusChip(job.status)}</TableCell>
                        <TableCell>
                          {DateTime.fromISO(job.startedAt).toRelative()}
                        </TableCell>
                        <TableCell>
                          {job.completedAt
                            ? DateTime.fromISO(job.completedAt)
                                .diff(DateTime.fromISO(job.startedAt))
                                .toFormat('mm:ss')
                            : '-'}
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setSelectedJob(job);
                              setOpenDialog(true);
                            }}
                          >
                            <InfoIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Job Details Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Job Details</DialogTitle>
        <DialogContent>
          {selectedJob && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="subtitle2">Job Name</Typography>
                <Typography>{selectedJob.jobName}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2">Status</Typography>
                <Typography>{selectedJob.status}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2">Started At</Typography>
                <Typography>
                  {DateTime.fromISO(selectedJob.startedAt).toFormat('ff')}
                </Typography>
              </Grid>
              {selectedJob.completedAt && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Completed At</Typography>
                  <Typography>
                    {DateTime.fromISO(selectedJob.completedAt).toFormat('ff')}
                  </Typography>
                </Grid>
              )}
              {selectedJob.error && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="error">
                    Error
                  </Typography>
                  <Typography color="error">{selectedJob.error}</Typography>
                </Grid>
              )}
              {selectedJob.metadata && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Metadata</Typography>
                  <pre>
                    {JSON.stringify(selectedJob.metadata, null, 2)}
                  </pre>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
