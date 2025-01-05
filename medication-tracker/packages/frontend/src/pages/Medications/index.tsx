import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Grid,
  useTheme,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useMedication } from '../../hooks/useMedication';
import MedicationList from './components/MedicationList';
import MedicationDialog from './components/MedicationDialog';
import MedicationFilters from './components/MedicationFilters';
import type { Medication } from '../../store/slices/medicationSlice';

export const Medications: React.FC = () => {
  const theme = useTheme();
  const [openDialog, setOpenDialog] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    category: 'all',
    status: 'all',
  });

  const {
    medications,
    loading,
    error,
    addMedication,
    updateMedication,
    deleteMedication,
    selectedMedication,
    selectMedicationById,
    clearSelection,
  } = useMedication();

  const handleOpenDialog = () => {
    clearSelection();
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    clearSelection();
    setOpenDialog(false);
  };

  const handleSaveMedication = async (medicationData: Partial<Medication>) => {
    let success;
    if (selectedMedication) {
      success = await updateMedication(selectedMedication.id, medicationData);
    } else {
      success = await addMedication(medicationData);
    }

    if (success) {
      handleCloseDialog();
    }
  };

  const handleEdit = (id: string) => {
    selectMedicationById(id);
    setOpenDialog(true);
  };

  const filteredMedications = medications.filter((med) => {
    const matchesSearch = med.name.toLowerCase().includes(filters.search.toLowerCase());
    const matchesCategory = filters.category === 'all' || med.category === filters.category;
    const matchesStatus = filters.status === 'all' || med.status === filters.status;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Grid container spacing={3}>
        <Grid item xs={12} sx={{ mb: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h4" component="h1">
              Medications
            </Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleOpenDialog}
            >
              Add Medication
            </Button>
          </Box>
        </Grid>

        <Grid item xs={12}>
          <MedicationFilters
            filters={filters}
            onFilterChange={setFilters}
          />
        </Grid>

        <Grid item xs={12}>
          <MedicationList
            medications={filteredMedications}
            onEdit={handleEdit}
            onDelete={deleteMedication}
          />
        </Grid>
      </Grid>

      <MedicationDialog
        open={openDialog}
        onClose={handleCloseDialog}
        onSave={handleSaveMedication}
        medication={selectedMedication}
      />
    </Box>
  );
};

export default Medications;
