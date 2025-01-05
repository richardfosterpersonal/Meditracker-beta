import React from 'react';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Grid,
  Button,
  useTheme,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import {
  Check as CheckIcon,
  Close as CloseIcon,
  Info as InfoIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { format, isToday, isPast } from 'date-fns';
import {
  useGetDoseLogsQuery,
  useLogDoseMutation,
  useGetAdherenceStatsQuery,
  type DoseLog,
} from '../../../store/services/medicationScheduleApi';

interface MedicationAdherenceProps {
  scheduleId: string;
  medicationName: string;
}

const MedicationAdherence: React.FC<MedicationAdherenceProps> = ({
  scheduleId,
  medicationName,
}) => {
  const theme = useTheme();
  const [selectedLog, setSelectedLog] = React.useState<DoseLog | null>(null);
  const [notes, setNotes] = React.useState('');

  const { data: doseLogs, isLoading: loadingLogs } = useGetDoseLogsQuery(scheduleId);
  const { data: adherenceStats } = useGetAdherenceStatsQuery(scheduleId);
  const [logDose] = useLogDoseMutation();

  const handleLogDose = async (status: DoseLog['status'], scheduledTime: string) => {
    try {
      await logDose({
        scheduleId,
        status,
        scheduledTime,
        takenTime: status === 'taken' ? new Date().toISOString() : undefined,
        notes: notes.trim() || undefined,
      }).unwrap();
      setSelectedLog(null);
      setNotes('');
    } catch (error) {
      console.error('Failed to log dose:', error);
    }
  };

  const getStatusColor = (status: DoseLog['status']) => {
    switch (status) {
      case 'taken':
        return theme.palette.success.main;
      case 'missed':
        return theme.palette.error.main;
      case 'late':
        return theme.palette.warning.main;
      case 'skipped':
        return theme.palette.grey[500];
      default:
        return theme.palette.text.primary;
    }
  };

  if (loadingLogs) {
    return <CircularProgress />;
  }

  return (
    <Box>
      {/* Adherence Statistics */}
      <Paper
        elevation={0}
        variant="outlined"
        sx={{
          p: 2,
          mb: 3,
          borderRadius: theme.shape.borderRadius,
        }}
      >
        <Typography variant="h6" gutterBottom>
          Adherence Statistics
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={6} sm={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="success.main">
                {adherenceStats?.taken || 0}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Taken
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="error.main">
                {adherenceStats?.missed || 0}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Missed
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="warning.main">
                {adherenceStats?.late || 0}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Late
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4">
                {adherenceStats?.adherenceRate
                  ? `${Math.round(adherenceStats.adherenceRate)}%`
                  : '0%'}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Adherence Rate
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Dose Logs */}
      <Paper
        elevation={0}
        variant="outlined"
        sx={{
          p: 2,
          borderRadius: theme.shape.borderRadius,
        }}
      >
        <Typography variant="h6" gutterBottom>
          Dose History
        </Typography>
        {doseLogs?.map((log) => (
          <Box
            key={log.id}
            sx={{
              p: 2,
              mb: 1,
              borderRadius: 1,
              border: `1px solid ${theme.palette.divider}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box>
              <Typography variant="subtitle2">
                {format(new Date(log.scheduledTime), 'MMM d, yyyy h:mm a')}
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: getStatusColor(log.status) }}
              >
                {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                {log.takenTime && ` at ${format(new Date(log.takenTime), 'h:mm a')}`}
              </Typography>
              {log.notes && (
                <Typography variant="body2" color="textSecondary">
                  {log.notes}
                </Typography>
              )}
            </Box>
            <Box>
              {log.notes ? (
                <Tooltip title={log.notes}>
                  <IconButton size="small">
                    <InfoIcon />
                  </IconButton>
                </Tooltip>
              ) : (
                <IconButton
                  size="small"
                  onClick={() => setSelectedLog(log)}
                >
                  <EditIcon />
                </IconButton>
              )}
            </Box>
          </Box>
        ))}
      </Paper>

      {/* Log Dialog */}
      <Dialog
        open={!!selectedLog}
        onClose={() => {
          setSelectedLog(null);
          setNotes('');
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Log Dose for {medicationName}</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Scheduled for:{' '}
            {selectedLog &&
              format(new Date(selectedLog.scheduledTime), 'MMM d, yyyy h:mm a')}
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() =>
              selectedLog && handleLogDose('skipped', selectedLog.scheduledTime)
            }
            color="inherit"
          >
            Skip
          </Button>
          <Button
            onClick={() =>
              selectedLog && handleLogDose('missed', selectedLog.scheduledTime)
            }
            color="error"
            startIcon={<CloseIcon />}
          >
            Missed
          </Button>
          <Button
            onClick={() =>
              selectedLog && handleLogDose('taken', selectedLog.scheduledTime)
            }
            color="success"
            variant="contained"
            startIcon={<CheckIcon />}
          >
            Taken
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MedicationAdherence;
