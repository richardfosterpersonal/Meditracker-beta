import React from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
} from '@mui/material';
import { CustomNotificationRules } from '../components/notifications/CustomNotificationRules';

export const NotificationRulesPage: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Notification Rules
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Create and manage custom notification rules for your medications. Set up alerts based on
        time, supply levels, compliance rates, or refill needs.
      </Typography>
      <Paper sx={{ p: 3, mt: 3 }}>
        <CustomNotificationRules />
      </Paper>
    </Container>
  );
};
