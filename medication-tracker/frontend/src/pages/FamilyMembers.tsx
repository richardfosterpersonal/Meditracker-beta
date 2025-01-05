import React from 'react';
import { Box, Typography, Container } from '@mui/material';

const FamilyMembers: React.FC = () => {
  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Family Members
        </Typography>
        <Typography variant="body1">
          Family members management page is under construction.
        </Typography>
      </Box>
    </Container>
  );
};

export default FamilyMembers;
