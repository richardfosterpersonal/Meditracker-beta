import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Alert,
  Chip
} from '@mui/material';
import {
  Check as CheckIcon,
  Phone as PhoneIcon,
  Message as MessageIcon
} from '@mui/icons-material';
import { api } from '../../services/api';
import { useWebSocketConnection } from '../../hooks/useWebSocketConnection';

interface PatientAlert {
  id: string;
  patientId: string;
  patientName: string;
  type: 'missed_dose' | 'low_supply' | 'compliance';
  status: 'new' | 'acknowledged' | 'resolved';
  message: string;
  timestamp: string;
}

export const AlertManagement: React.FC = () => {
  const [alerts, setAlerts] = useState<PatientAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<PatientAlert | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionNote, setActionNote] = useState('');
  const { lastMessage } = useWebSocketConnection('/ws/carer/alerts');

  const fetchAlerts = async () => {
    try {
      const response = await api.get('/api/v1/carer/alerts');
      setAlerts(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to load alerts');
      console.error('Error fetching alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  useEffect(() => {
    if (lastMessage) {
      try {
        const data = JSON.parse(lastMessage.data);
        if (data.type === 'NEW_ALERT') {
          setAlerts(prev => [data.payload, ...prev]);
        }
      } catch (err) {
        console.error('Error processing alert update:', err);
      }
    }
  }, [lastMessage]);

  const handleAlertAction = async (action: 'acknowledge' | 'resolve') => {
    if (!selectedAlert) return;

    try {
      await api.put(`/api/v1/carer/alerts/${selectedAlert.id}`, {
        action,
        note: actionNote
      });

      setAlerts(prev =>
        prev.map(alert =>
          alert.id === selectedAlert.id
            ? { ...alert, status: action === 'resolve' ? 'resolved' : 'acknowledged' }
            : alert
        )
      );

      setActionDialogOpen(false);
      setSelectedAlert(null);
      setActionNote('');
    } catch (err) {
      console.error('Error updating alert:', err);
      setError('Failed to update alert');
    }
  };

  const handleContactPatient = async (alertId: string, method: 'phone' | 'message') => {
    try {
      await api.post(`/api/v1/carer/alerts/${alertId}/contact`, { method });
    } catch (err) {
      console.error('Error contacting patient:', err);
      setError('Failed to initiate contact');
    }
  };

  if (loading) {
    return <CircularProgress />;
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Patient Alerts
        </Typography>
        <List>
          {alerts.map((alert) => (
            <ListItem
              key={alert.id}
              divider
              sx={{
                bgcolor: 
                  alert.status === 'new'
                    ? 'error.lighter'
                    : alert.status === 'acknowledged'
                    ? 'warning.lighter'
                    : 'inherit'
              }}
            >
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle1">
                      {alert.patientName}
                    </Typography>
                    <Chip
                      label={alert.type.replace('_', ' ')}
                      size="small"
                      color={
                        alert.type === 'missed_dose'
                          ? 'error'
                          : alert.type === 'low_supply'
                          ? 'warning'
                          : 'default'
                      }
                    />
                  </Box>
                }
                secondary={
                  <>
                    {alert.message}
                    <br />
                    {new Date(alert.timestamp).toLocaleString()}
                  </>
                }
              />
              <ListItemSecondaryAction>
                <IconButton
                  onClick={() => handleContactPatient(alert.id, 'phone')}
                  size="small"
                >
                  <PhoneIcon />
                </IconButton>
                <IconButton
                  onClick={() => handleContactPatient(alert.id, 'message')}
                  size="small"
                >
                  <MessageIcon />
                </IconButton>
                {alert.status === 'new' && (
                  <IconButton
                    onClick={() => {
                      setSelectedAlert(alert);
                      setActionDialogOpen(true);
                    }}
                    size="small"
                    color="primary"
                  >
                    <CheckIcon />
                  </IconButton>
                )}
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      </CardContent>

      <Dialog open={actionDialogOpen} onClose={() => setActionDialogOpen(false)}>
        <DialogTitle>Alert Action</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Action Note"
            value={actionNote}
            onChange={(e) => setActionNote(e.target.value)}
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={() => handleAlertAction('acknowledge')}
            color="primary"
          >
            Acknowledge
          </Button>
          <Button
            onClick={() => handleAlertAction('resolve')}
            color="success"
            variant="contained"
          >
            Resolve
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};
