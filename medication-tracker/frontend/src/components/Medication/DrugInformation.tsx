import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  useTheme,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';
import { drugInfoService, DrugInfo } from '../../services/DrugInfoService';

interface DrugInformationProps {
  medicationName: string;
  currentMedications?: string[];
}

export const DrugInformation: React.FC<DrugInformationProps> = ({
  medicationName,
  currentMedications = [],
}) => {
  const theme = useTheme();
  const [drugInfo, setDrugInfo] = useState<DrugInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [interactions, setInteractions] = useState<any[]>([]);

  useEffect(() => {
    const fetchDrugInfo = async () => {
      try {
        setLoading(true);
        const info = await drugInfoService.getDrugInfo(medicationName);
        setDrugInfo(info);

        if (currentMedications.length > 0) {
          const interactionData = await drugInfoService.checkInteractions([
            medicationName,
            ...currentMedications,
          ]);
          setInteractions(interactionData);
        }

        setError(null);
      } catch (err) {
        console.error('Error fetching drug information:', err);
        setError('Failed to load drug information');
      } finally {
        setLoading(false);
      }
    };

    fetchDrugInfo();
  }, [medicationName, currentMedications]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (!drugInfo) {
    return <Alert severity="info">No information available for this medication</Alert>;
  }

  return (
    <Box>
      {/* Description */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            About {drugInfo.name}
          </Typography>
          <Typography variant="body1">{drugInfo.description}</Typography>
        </CardContent>
      </Card>

      {/* Interactions Warning */}
      {interactions.length > 0 && (
        <Alert 
          severity="warning" 
          icon={<WarningIcon />}
          sx={{ mb: 2 }}
        >
          <Typography variant="subtitle1" gutterBottom>
            Potential Drug Interactions Detected
          </Typography>
          <List>
            {interactions.map((interaction, index) => (
              <ListItem key={index}>
                <ListItemText
                  primary={`${interaction.drugs.join(' + ')}`}
                  secondary={interaction.description}
                />
                <Chip
                  label={interaction.severity}
                  color={
                    interaction.severity === 'severe'
                      ? 'error'
                      : interaction.severity === 'moderate'
                      ? 'warning'
                      : 'default'
                  }
                  size="small"
                />
              </ListItem>
            ))}
          </List>
        </Alert>
      )}

      {/* Dosage Guidelines */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">Dosage Guidelines</Typography>
        </AccordionSummary>
        <AccordionDetails>
          {drugInfo.dosageGuidelines.map((guideline, index) => (
            <Box key={index} mb={2}>
              <Typography variant="subtitle2" color="primary" gutterBottom>
                {guideline.form} - {guideline.route}
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Default Dose"
                    secondary={guideline.defaultDose}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Frequency"
                    secondary={guideline.frequency}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Maximum Daily Dose"
                    secondary={guideline.maxDailyDose}
                  />
                </ListItem>
                {guideline.specialInstructions && (
                  <ListItem>
                    <ListItemText
                      primary="Special Instructions"
                      secondary={guideline.specialInstructions}
                    />
                  </ListItem>
                )}
              </List>
              {index < drugInfo.dosageGuidelines.length - 1 && <Divider />}
            </Box>
          ))}
        </AccordionDetails>
      </Accordion>

      {/* Side Effects */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">Side Effects</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <List>
            {drugInfo.sideEffects.map((effect, index) => (
              <ListItem key={index}>
                <ListItemText primary={effect} />
              </ListItem>
            ))}
          </List>
        </AccordionDetails>
      </Accordion>

      {/* Warnings */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">Warnings</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <List>
            {drugInfo.warnings.map((warning, index) => (
              <ListItem key={index}>
                <ListItemText
                  primary={warning}
                  primaryTypographyProps={{
                    sx: { color: theme.palette.warning.main }
                  }}
                />
              </ListItem>
            ))}
          </List>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};
