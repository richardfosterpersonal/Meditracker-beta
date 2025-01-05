import React, { useState } from 'react';
import { Box, Container, Typography, Button } from '@mui/material';
import { MedicationForm } from '../components/medications/MedicationForm';
import { MedicationList, Medication } from '../components/medications/MedicationList';
import { useAccessibility } from '../hooks/useAccessibility';

export const MedicationsPage: React.FC = () => {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [editingMedication, setEditingMedication] = useState<Medication | null>(null);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const { settings } = useAccessibility();

  const handleAddMedication = (medicationData: Omit<Medication, 'id'>) => {
    const newMedication = {
      ...medicationData,
      id: Date.now().toString(), // Simple ID generation for demo
    };
    setMedications([...medications, newMedication]);
    setIsFormVisible(false);
  };

  const handleEditMedication = (medication: Medication) => {
    setEditingMedication(medication);
    setIsFormVisible(true);
  };

  const handleUpdateMedication = (updatedMedication: Medication) => {
    setMedications(medications.map(med => 
      med.id === updatedMedication.id ? updatedMedication : med
    ));
    setEditingMedication(null);
    setIsFormVisible(false);
  };

  const handleDeleteMedication = (medicationId: string) => {
    setMedications(medications.filter(med => med.id !== medicationId));
  };

  return (
    <Container maxWidth="lg">
      <Box
        component="main"
        role="main"
        aria-label="Medications management"
        sx={{ py: 4 }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 4,
          }}
        >
          <Typography
            variant="h4"
            component="h1"
            sx={{
              ...(settings.screenReaderOptimized && {
                fontSize: '2.5rem',
              }),
            }}
          >
            Medications
          </Typography>
          {!isFormVisible && (
            <Button
              variant="contained"
              color="primary"
              onClick={() => setIsFormVisible(true)}
              size={settings.screenReaderOptimized ? 'large' : 'medium'}
              aria-label="Add new medication"
            >
              Add Medication
            </Button>
          )}
        </Box>

        {isFormVisible ? (
          <Box sx={{ mb: 4 }}>
            <MedicationForm
              onSubmit={editingMedication ? handleUpdateMedication : handleAddMedication}
              initialValues={editingMedication || undefined}
              mode={editingMedication ? 'edit' : 'create'}
            />
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                onClick={() => {
                  setIsFormVisible(false);
                  setEditingMedication(null);
                }}
                sx={{ mr: 2 }}
                size={settings.screenReaderOptimized ? 'large' : 'medium'}
              >
                Cancel
              </Button>
            </Box>
          </Box>
        ) : (
          <MedicationList
            medications={medications}
            onEdit={handleEditMedication}
            onDelete={handleDeleteMedication}
          />
        )}
      </Box>
    </Container>
  );
};
