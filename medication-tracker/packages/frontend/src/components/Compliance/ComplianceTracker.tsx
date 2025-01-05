import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  Chip
} from '@mui/material';
import { api } from '../../services/api';

interface ComplianceStats {
  overall: number;
  lastWeek: number;
  lastMonth: number;
  missedDoses: number;
  lateDoses: number;
  totalDoses: number;
  streak: number;
}

interface DoseRecord {
  medicationId: string;
  medicationName: string;
  scheduledTime: string;
  takenTime?: string;
  status: 'taken' | 'missed' | 'late';
}

interface ComplianceTrackerProps {
  patientId?: string; // Optional: if viewing as carer for specific patient
}

export const ComplianceTracker: React.FC<ComplianceTrackerProps> = ({ patientId }) => {
  const [stats, setStats] = useState<ComplianceStats | null>(null);
  const [recentDoses, setRecentDoses] = useState<DoseRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchComplianceData = async () => {
      try {
        const endpoint = patientId 
          ? `/api/v1/compliance/${patientId}`
          : '/api/v1/compliance';
        
        const [statsResponse, dosesResponse] = await Promise.all([
          api.get(`${endpoint}/stats`),
          api.get(`${endpoint}/recent-doses`)
        ]);

        setStats(statsResponse.data);
        setRecentDoses(dosesResponse.data);
      } catch (error) {
        console.error('Error fetching compliance data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchComplianceData();
    // Set up periodic refresh
    const interval = setInterval(fetchComplianceData, 300000); // Refresh every 5 minutes
    return () => clearInterval(interval);
  }, [patientId]);

  if (loading) {
    return <CircularProgress />;
  }

  if (!stats) {
    return <Typography color="error">Failed to load compliance data</Typography>;
  }

  const getStatusColor = (status: DoseRecord['status']) => {
    switch (status) {
      case 'taken':
        return 'success';
      case 'late':
        return 'warning';
      case 'missed':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Grid container spacing={3}>
      {/* Overall Compliance Card */}
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Overall Compliance
            </Typography>
            <Box display="flex" justifyContent="center" alignItems="center" my={2}>
              <CircularProgress
                variant="determinate"
                value={stats.overall}
                size={120}
                thickness={4}
                color={stats.overall >= 80 ? 'success' : 'warning'}
              />
              <Typography
                variant="h4"
                component="div"
                sx={{ position: 'absolute' }}
              >
                {stats.overall}%
              </Typography>
            </Box>
            <Divider sx={{ my: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Last Week
                </Typography>
                <Typography variant="h6">{stats.lastWeek}%</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Last Month
                </Typography>
                <Typography variant="h6">{stats.lastMonth}%</Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* Streak and Statistics Card */}
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Statistics
            </Typography>
            <List>
              <ListItem>
                <ListItemText
                  primary="Current Streak"
                  secondary={`${stats.streak} days`}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Total Doses"
                  secondary={stats.totalDoses}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Missed Doses"
                  secondary={stats.missedDoses}
                  secondaryTypographyProps={{
                    color: stats.missedDoses > 0 ? 'error' : 'textSecondary'
                  }}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Late Doses"
                  secondary={stats.lateDoses}
                  secondaryTypographyProps={{
                    color: stats.lateDoses > 0 ? 'warning' : 'textSecondary'
                  }}
                />
              </ListItem>
            </List>
          </CardContent>
        </Card>
      </Grid>

      {/* Recent Activity Card */}
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Recent Activity
            </Typography>
            <List>
              {recentDoses.map((dose, index) => (
                <ListItem
                  key={`${dose.medicationId}-${dose.scheduledTime}`}
                  divider={index !== recentDoses.length - 1}
                >
                  <ListItemText
                    primary={dose.medicationName}
                    secondary={
                      <>
                        Scheduled: {new Date(dose.scheduledTime).toLocaleString()}
                        {dose.takenTime && (
                          <>
                            <br />
                            Taken: {new Date(dose.takenTime).toLocaleString()}
                          </>
                        )}
                      </>
                    }
                  />
                  <Chip
                    label={dose.status}
                    color={getStatusColor(dose.status)}
                    size="small"
                  />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};
