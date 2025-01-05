import React, { useEffect, useState } from 'react';
import { Box, Grid, Typography, useTheme, CircularProgress, Alert, Button, Container } from '@mui/material';
import { MedicationList } from '../Medication/MedicationList';
import { NotificationCenter } from '../Notification/NotificationCenter';
import { ComplianceChart } from '../Charts/ComplianceChart';
import { UpcomingDoses } from '../Medication/UpcomingDoses';
import { UserStats } from '../User/UserStats';
import { MedicationOverview } from './MedicationOverview';
import { QuickActions } from './QuickActions';
import { FamilyOverview } from './FamilyOverview';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../services/api';
import { DashboardErrorBoundary } from './DashboardErrorBoundary';
import { useRetryableQuery } from '../../hooks/useRetryableQuery';

interface DashboardStats {
  totalMedications: number;
  activeMedications: number;
  complianceRate: number;
  upcomingDoses: number;
  missedDoses: number;
  refillsNeeded: number;
}

export const Dashboard: React.FC = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const { lastMessage } = useWebSocket(`/api/v1/ws/notifications/${user?.id}`);

  const {
    data: stats,
    loading,
    error,
    retry
  } = useRetryableQuery(
    async () => {
      const response = await api.get(`/api/v1/users/${user?.id}/stats`);
      return response.data;
    },
    {
      maxRetries: 3,
      onError: (error) => console.error('Failed to fetch dashboard stats:', error)
    }
  );

  // Update stats when receiving WebSocket message
  useEffect(() => {
    if (lastMessage?.type === 'STATS_UPDATE') {
      // Update local stats with WebSocket data
      // setStats(prevStats => ({
      //   ...prevStats,
      //   ...lastMessage.data
      // }));
    }
  }, [lastMessage]);

  if (!user) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6">
          Please log in to view your dashboard
        </Typography>
      </Box>
    );
  }

  return (
    <DashboardErrorBoundary>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert 
            severity="error" 
            action={
              <Button color="inherit" size="small" onClick={retry}>
                Retry
              </Button>
            }
          >
            Failed to load dashboard statistics
          </Alert>
        ) : (
          <Grid container spacing={3}>
            {/* User Stats Overview */}
            <Grid item xs={12}>
              <ErrorBoundary componentName="UserStats">
                <Box data-testid="user-stats-container">
                  <UserStats stats={stats} />
                </Box>
              </ErrorBoundary>
            </Grid>

            {/* Main Content Area */}
            <Grid item xs={12} md={8}>
              <Grid container spacing={3}>
                {/* Quick Actions */}
                <Grid item xs={12}>
                  <ErrorBoundary componentName="QuickActions">
                    <QuickActions />
                  </ErrorBoundary>
                </Grid>

                {/* Family Overview */}
                <Grid item xs={12}>
                  <ErrorBoundary componentName="FamilyOverview">
                    <FamilyOverview />
                  </ErrorBoundary>
                </Grid>

                {/* Medication Overview */}
                <Grid item xs={12}>
                  <ErrorBoundary componentName="MedicationOverview">
                    <MedicationOverview />
                  </ErrorBoundary>
                </Grid>

                {/* Upcoming Doses */}
                <Grid item xs={12}>
                  <ErrorBoundary componentName="UpcomingDoses">
                    <Box sx={{ 
                      bgcolor: 'background.paper',
                      p: 2,
                      borderRadius: 1,
                      boxShadow: 1
                    }} data-testid="upcoming-doses-container">
                      <Typography variant="h6" gutterBottom>
                        Upcoming Doses
                      </Typography>
                      <UpcomingDoses />
                    </Box>
                  </ErrorBoundary>
                </Grid>

                {/* Medication List */}
                <Grid item xs={12}>
                  <Box sx={{ 
                    bgcolor: 'background.paper',
                    p: 2,
                    borderRadius: 1,
                    boxShadow: 1
                  }}>
                    <Typography variant="h6" gutterBottom>
                      My Medications
                    </Typography>
                    <MedicationList />
                  </Box>
                </Grid>

                {/* Compliance Chart */}
                <Grid item xs={12}>
                  <ErrorBoundary componentName="ComplianceChart">
                    <Box sx={{ 
                      bgcolor: 'background.paper',
                      p: 2,
                      borderRadius: 1,
                      boxShadow: 1
                    }} data-testid="compliance-chart-container">
                      <Typography variant="h6" gutterBottom>
                        Compliance Overview
                      </Typography>
                      <ComplianceChart />
                    </Box>
                  </ErrorBoundary>
                </Grid>
              </Grid>
            </Grid>

            {/* Notification Sidebar */}
            <Grid item xs={12} md={4}>
              <ErrorBoundary componentName="NotificationCenter">
                <Box sx={{ 
                  bgcolor: 'background.paper',
                  p: 2,
                  borderRadius: 1,
                  boxShadow: 1,
                  height: '100%'
                }} data-testid="notification-center-container">
                  <Typography variant="h6" gutterBottom>
                    Notifications
                  </Typography>
                  <NotificationCenter />
                </Box>
              </ErrorBoundary>
            </Grid>
          </Grid>
        )}
      </Container>
    </DashboardErrorBoundary>
  );
};
