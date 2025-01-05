import React from 'react';
import { Container, Typography, Box } from '@mui/material';
import MedicationList from './MedicationList';
import MedicationSchedule from './MedicationSchedule';
import UpcomingDoses from './UpcomingDoses';

const MedicationsPage: React.FC = () => {
  return (
    <Container maxWidth="lg">
      <Typography variant="h4" component="h1" gutterBottom>
        Medications
      </Typography>
      <Box sx={{ mb: 4 }}>
        <UpcomingDoses />
      </Box>
      <Box sx={{ mb: 4 }}>
        <MedicationList />
      </Box>
      <Box sx={{ mb: 4 }}>
        <MedicationSchedule />
      </Box>
    </Container>
  );
};

export default MedicationsPage;
