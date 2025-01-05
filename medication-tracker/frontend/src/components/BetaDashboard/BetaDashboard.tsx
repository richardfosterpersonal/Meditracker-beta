import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Chip,
  Button,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import ErrorIcon from '@mui/icons-material/Error';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PeopleIcon from '@mui/icons-material/People';
import FeedbackIcon from '@mui/icons-material/Feedback';

interface DashboardSummary {
  current_phase: string;
  progress: number;
  active_issues: number;
  active_testers: number;
  recent_feedback: number;
  next_actions: string[];
}

interface ActionItem {
  type: 'validation' | 'issue';
  priority: 'high' | 'medium' | 'low';
  description: string;
  details: any;
}

const BetaDashboard: React.FC = () => {
  const theme = useTheme();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [summaryRes, actionsRes] = await Promise.all([
        fetch('/api/beta/summary'),
        fetch('/api/beta/actions')
      ]);

      if (!summaryRes.ok || !actionsRes.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const summaryData = await summaryRes.json();
      const actionsData = await actionsRes.json();

      setSummary(summaryData);
      setActions(actionsData.actions);
      setError(null);
    } catch (err) {
      setError('Failed to load dashboard data. Please try again.');
      console.error('Dashboard fetch error:', err);
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
      <Box m={2}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!summary) {
    return null;
  }

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Beta Testing Dashboard
      </Typography>

      {/* Progress Overview */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Current Progress
          </Typography>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="textSecondary">
              Phase: {summary.current_phase}
            </Typography>
            <LinearProgress 
              variant="determinate" 
              value={summary.progress} 
              sx={{ mt: 1, height: 10, borderRadius: 5 }}
            />
            <Typography variant="body2" color="textSecondary" align="right">
              {Math.round(summary.progress)}%
            </Typography>
          </Box>

          <Box display="flex" justifyContent="space-between" flexWrap="wrap" gap={2}>
            <Chip
              icon={<ErrorIcon />}
              label={`${summary.active_issues} Active Issues`}
              color={summary.active_issues > 0 ? "warning" : "success"}
            />
            <Chip
              icon={<PeopleIcon />}
              label={`${summary.active_testers} Active Testers`}
              color="primary"
            />
            <Chip
              icon={<FeedbackIcon />}
              label={`${summary.recent_feedback} Recent Feedback`}
              color="info"
            />
          </Box>
        </CardContent>
      </Card>

      {/* Action Items */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Action Items
          </Typography>
          <List>
            {actions.length > 0 ? (
              actions.map((action, index) => (
                <React.Fragment key={index}>
                  <ListItem>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          {action.priority === 'high' ? (
                            <ErrorIcon color="error" fontSize="small" />
                          ) : (
                            <CheckCircleIcon color="info" fontSize="small" />
                          )}
                          {action.description}
                        </Box>
                      }
                      secondary={`Priority: ${action.priority}`}
                    />
                    <Button 
                      variant="outlined" 
                      size="small"
                      onClick={() => console.log('View details:', action)}
                    >
                      View Details
                    </Button>
                  </ListItem>
                  {index < actions.length - 1 && <Divider />}
                </React.Fragment>
              ))
            ) : (
              <ListItem>
                <ListItemText 
                  primary="No pending actions"
                  secondary="All current requirements are met"
                />
              </ListItem>
            )}
          </List>
        </CardContent>
      </Card>

      {/* Next Steps */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Next Steps
          </Typography>
          <List>
            {summary.next_actions.length > 0 ? (
              summary.next_actions.map((action, index) => (
                <ListItem key={index}>
                  <ListItemText primary={action} />
                </ListItem>
              ))
            ) : (
              <ListItem>
                <ListItemText 
                  primary="No next steps required"
                  secondary="Current phase is proceeding as planned"
                />
              </ListItem>
            )}
          </List>
        </CardContent>
      </Card>
    </Box>
  );
};

export default BetaDashboard;
