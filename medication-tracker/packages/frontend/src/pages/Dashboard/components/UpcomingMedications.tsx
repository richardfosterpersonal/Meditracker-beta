import React from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  Chip,
  useTheme,
} from '@mui/material';
import { format, isSameDay } from 'date-fns';
import type { Medication } from '../../../store/services/medicationApi';

interface UpcomingMedicationsProps {
  medications: Medication[];
}

const UpcomingMedications: React.FC<UpcomingMedicationsProps> = ({
  medications,
}) => {
  const theme = useTheme();

  const upcomingMedications = medications
    .filter((med) => {
      const nextDose = new Date(med.nextDose);
      const now = new Date();
      return nextDose > now && med.status === 'active';
    })
    .sort((a, b) => new Date(a.nextDose).getTime() - new Date(b.nextDose).getTime())
    .slice(0, 5);

  const formatDoseTime = (date: string) => {
    const doseDate = new Date(date);
    const now = new Date();

    if (isSameDay(doseDate, now)) {
      return `Today at ${format(doseDate, 'h:mm a')}`;
    }

    return format(doseDate, 'MMM d, h:mm a');
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Upcoming Medications
      </Typography>
      <List>
        {upcomingMedications.map((med) => (
          <ListItem
            key={med.id}
            sx={{
              borderRadius: 1,
              mb: 1,
              backgroundColor: theme.palette.background.paper,
              '&:hover': {
                backgroundColor: theme.palette.action.hover,
              },
            }}
          >
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="subtitle2">{med.name}</Typography>
                  <Chip
                    label={med.dosage}
                    size="small"
                    sx={{ backgroundColor: theme.palette.primary.light }}
                  />
                </Box>
              }
              secondary={
                <Box sx={{ mt: 0.5 }}>
                  <Typography variant="body2" color="textSecondary">
                    {formatDoseTime(med.nextDose)}
                  </Typography>
                  {med.instructions && (
                    <Typography
                      variant="body2"
                      color="textSecondary"
                      sx={{
                        mt: 0.5,
                        fontStyle: 'italic',
                      }}
                    >
                      {med.instructions}
                    </Typography>
                  )}
                </Box>
              }
            />
          </ListItem>
        ))}
      </List>
      {upcomingMedications.length === 0 && (
        <Typography
          variant="body2"
          color="textSecondary"
          align="center"
          sx={{ mt: 2 }}
        >
          No upcoming medications
        </Typography>
      )}
    </Box>
  );
};

export default UpcomingMedications;
