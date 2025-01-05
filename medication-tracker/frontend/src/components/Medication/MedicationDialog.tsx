import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Divider,
  Grid,
  Tabs,
  Tab,
  useTheme,
} from '@mui/material';
import { drugInfoService } from '../../services/DrugInfoService';
import { DrugInformation } from './DrugInformation';

interface MedicationDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (medicationData: any) => Promise<void>;
  medication?: any;
  currentMedications?: string[];
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`medication-tabpanel-${index}`}
      aria-labelledby={`medication-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export const MedicationDialog: React.FC<MedicationDialogProps> = ({
  open,
  onClose,
  onSave,
  medication,
  currentMedications = [],
}) => {
  const theme = useTheme();
  const [tabValue, setTabValue] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    dosage: {
      amount: '',
      unit: '',
      frequency: '',
      times_per_day: 1,
      specific_times: ['09:00'],
    },
    category: '',
    instructions: '',
    is_prn: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dosageGuidelines, setDosageGuidelines] = useState<any>(null);

  useEffect(() => {
    if (medication) {
      setFormData({
        name: medication.name,
        dosage: medication.dosage,
        category: medication.category || '',
        instructions: medication.instructions || '',
        is_prn: medication.is_prn || false,
      });
    } else {
      setFormData({
        name: '',
        dosage: {
          amount: '',
          unit: '',
          frequency: '',
          times_per_day: 1,
          specific_times: ['09:00'],
        },
        category: '',
        instructions: '',
        is_prn: false,
      });
    }
  }, [medication]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // If medication name changes, fetch dosage guidelines
    if (field === 'name' && value) {
      fetchDosageGuidelines(value);
    }
  };

  const fetchDosageGuidelines = async (drugName: string) => {
    try {
      const guidelines = await drugInfoService.getDosageGuidelines(drugName, {
        age: 0, // These should come from patient profile
        weight: 0,
        conditions: [],
      });
      setDosageGuidelines(guidelines);
    } catch (error) {
      console.error('Error fetching dosage guidelines:', error);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      await onSave(formData);
      onClose();
    } catch (err) {
      setError('Failed to save medication');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {medication ? 'Edit Medication' : 'Add New Medication'}
      </DialogTitle>
      <Divider />
      
      <Tabs
        value={tabValue}
        onChange={handleTabChange}
        aria-label="medication dialog tabs"
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label="Basic Information" />
        <Tab label="Drug Information" />
      </Tabs>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Medication Name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Dosage Amount"
                value={formData.dosage.amount}
                onChange={(e) =>
                  handleInputChange('dosage', {
                    ...formData.dosage,
                    amount: e.target.value,
                  })
                }
                required
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Unit</InputLabel>
                <Select
                  value={formData.dosage.unit}
                  onChange={(e) =>
                    handleInputChange('dosage', {
                      ...formData.dosage,
                      unit: e.target.value,
                    })
                  }
                  label="Unit"
                  required
                >
                  <MenuItem value="mg">mg</MenuItem>
                  <MenuItem value="ml">ml</MenuItem>
                  <MenuItem value="tablet">tablet</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Frequency</InputLabel>
                <Select
                  value={formData.dosage.frequency}
                  onChange={(e) =>
                    handleInputChange('dosage', {
                      ...formData.dosage,
                      frequency: e.target.value,
                    })
                  }
                  label="Frequency"
                  required
                >
                  <MenuItem value="daily">Daily</MenuItem>
                  <MenuItem value="twice_daily">Twice Daily</MenuItem>
                  <MenuItem value="weekly">Weekly</MenuItem>
                  <MenuItem value="monthly">Monthly</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Instructions"
                multiline
                rows={3}
                value={formData.instructions}
                onChange={(e) => handleInputChange('instructions', e.target.value)}
              />
            </Grid>
          </Grid>

          {dosageGuidelines && (
            <Box mt={2}>
              <Alert severity="info">
                <Typography variant="subtitle2" gutterBottom>
                  Recommended Dosage:
                </Typography>
                <Typography variant="body2">
                  {dosageGuidelines.defaultDose} {dosageGuidelines.frequency}
                </Typography>
              </Alert>
            </Box>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {formData.name ? (
            <DrugInformation
              medicationName={formData.name}
              currentMedications={currentMedications}
            />
          ) : (
            <Alert severity="info">
              Please enter a medication name to view drug information
            </Alert>
          )}
        </TabPanel>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={loading}
          startIcon={loading && <CircularProgress size={20} />}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};
