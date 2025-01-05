import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  List,
  ListItem,
  Chip,
  Grid,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import {
  MedicalCondition,
  Medication,
  Allergy,
  medicalInfoService,
} from '../../services/MedicalInfoService';

// Types and Interfaces
export interface MedicalInfoState {
  medications: Medication[];
  conditions: MedicalCondition[];
  allergies: Allergy[];
  bloodType?: string;
  organDonor?: boolean;
  resuscitationPreference?: boolean;
}

export interface EditingItem {
  type: 'medication' | 'condition' | 'allergy';
  item: Partial<Medication | MedicalCondition | Allergy>;
}

export interface MedicalInfoManagerProps {
  onUpdate?: (info: MedicalInfoState) => void;
  readOnly?: boolean;
}

export const MedicalInfoManager: React.FC<MedicalInfoManagerProps> = ({
  onUpdate,
  readOnly = false,
}) => {
  const [medicalInfo, setMedicalInfo] = useState<MedicalInfoState>({
    medications: [],
    conditions: [],
    allergies: [],
  });

  const [openDialog, setOpenDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<EditingItem | null>(null);
  const [validationIssues, setValidationIssues] = useState<string[]>([]);

  useEffect(() => {
    loadMedicalInfo();
  }, []);

  const loadMedicalInfo = async () => {
    try {
      const info = await medicalInfoService.getMedicalInfoSnapshot();
      setMedicalInfo(info);
      onUpdate?.(info);

      const validation = await medicalInfoService.validateMedicalInfo();
      setValidationIssues(validation.issues);
    } catch (error) {
      console.error('Failed to load medical info:', error);
      setValidationIssues(['Failed to load medical information']);
    }
  };

  const handleAddItem = (type: 'medication' | 'condition' | 'allergy') => {
    const newItem: EditingItem = {
      type,
      item: type === 'medication'
        ? {
            name: '',
            dosage: '',
            frequency: '',
            purpose: '',
            instructions: '',
            startDate: new Date().toISOString().split('T')[0],
          }
        : type === 'condition'
        ? {
            name: '',
            diagnosedDate: new Date().toISOString().split('T')[0],
            severity: 'moderate',
            status: 'active',
            symptoms: [],
            treatments: [],
          }
        : {
            allergen: '',
            severity: 'moderate',
            reactions: [],
            diagnosed: new Date().toISOString().split('T')[0],
          },
    };
    setEditingItem(newItem);
    setOpenDialog(true);
  };

  const handleEditItem = (
    type: 'medication' | 'condition' | 'allergy',
    item: Medication | MedicalCondition | Allergy
  ) => {
    setEditingItem({ type, item: { ...item } });
    setOpenDialog(true);
  };

  const handleDeleteItem = async (
    type: 'medication' | 'condition' | 'allergy',
    id: string
  ) => {
    try {
      if (type === 'medication') {
        await medicalInfoService.removeMedication(id);
      } else if (type === 'condition') {
        await medicalInfoService.removeCondition(id);
      } else if (type === 'allergy') {
        await medicalInfoService.removeAllergy(id);
      }
      
      await loadMedicalInfo();
    } catch (error) {
      console.error('Failed to delete item:', error);
      setValidationIssues(['Failed to delete item']);
    }
  };

  const handleSaveItem = async () => {
    try {
      if (!editingItem) return;

      if (editingItem.type === 'medication') {
        if ('id' in editingItem.item && editingItem.item.id) {
          await medicalInfoService.updateMedication(
            editingItem.item.id,
            editingItem.item as Medication
          );
        } else {
          await medicalInfoService.addMedication(
            editingItem.item as Omit<Medication, 'id'>
          );
        }
      } else if (editingItem.type === 'condition') {
        if ('id' in editingItem.item && editingItem.item.id) {
          await medicalInfoService.updateCondition(
            editingItem.item.id,
            editingItem.item as MedicalCondition
          );
        } else {
          await medicalInfoService.addCondition(
            editingItem.item as Omit<MedicalCondition, 'id'>
          );
        }
      } else if (editingItem.type === 'allergy') {
        if ('id' in editingItem.item && editingItem.item.id) {
          await medicalInfoService.updateAllergy(
            editingItem.item.id,
            editingItem.item as Allergy
          );
        } else {
          await medicalInfoService.addAllergy(
            editingItem.item as Omit<Allergy, 'id'>
          );
        }
      }

      setOpenDialog(false);
      setEditingItem(null);
      await loadMedicalInfo();
    } catch (error) {
      console.error('Failed to save item:', error);
      setValidationIssues(['Failed to save item']);
    }
  };

  const renderMedicationForm = (medication: Partial<Medication>) => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <TextField
        label="Medication Name"
        value={medication.name || ''}
        onChange={(e) =>
          setEditingItem((prev) => ({
            ...prev!,
            item: { ...prev!.item, name: e.target.value },
          }))
        }
        fullWidth
        required
      />
      <TextField
        label="Dosage"
        value={medication.dosage || ''}
        onChange={(e) =>
          setEditingItem((prev) => ({
            ...prev!,
            item: { ...prev!.item, dosage: e.target.value },
          }))
        }
        fullWidth
        required
      />
      <TextField
        label="Frequency"
        value={medication.frequency || ''}
        onChange={(e) =>
          setEditingItem((prev) => ({
            ...prev!,
            item: { ...prev!.item, frequency: e.target.value },
          }))
        }
        fullWidth
        required
      />
      <TextField
        label="Purpose"
        value={medication.purpose || ''}
        onChange={(e) =>
          setEditingItem((prev) => ({
            ...prev!,
            item: { ...prev!.item, purpose: e.target.value },
          }))
        }
        fullWidth
      />
      <TextField
        label="Instructions"
        value={medication.instructions || ''}
        onChange={(e) =>
          setEditingItem((prev) => ({
            ...prev!,
            item: { ...prev!.item, instructions: e.target.value },
          }))
        }
        fullWidth
        multiline
        rows={3}
      />
      <TextField
        label="Start Date"
        type="date"
        value={medication.startDate?.split('T')[0] || ''}
        onChange={(e) =>
          setEditingItem((prev) => ({
            ...prev!,
            item: { ...prev!.item, startDate: e.target.value },
          }))
        }
        fullWidth
        InputLabelProps={{ shrink: true }}
      />
    </Box>
  );

  const renderConditionForm = (condition: Partial<MedicalCondition>) => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <TextField
        label="Condition Name"
        value={condition.name || ''}
        onChange={(e) =>
          setEditingItem((prev) => ({
            ...prev!,
            item: { ...prev!.item, name: e.target.value },
          }))
        }
        fullWidth
        required
      />
      <FormControl fullWidth>
        <InputLabel>Severity</InputLabel>
        <Select
          value={condition.severity || 'moderate'}
          onChange={(e) =>
            setEditingItem((prev) => ({
              ...prev!,
              item: { ...prev!.item, severity: e.target.value },
            }))
          }
        >
          <MenuItem value="mild">Mild</MenuItem>
          <MenuItem value="moderate">Moderate</MenuItem>
          <MenuItem value="severe">Severe</MenuItem>
        </Select>
      </FormControl>
      <FormControl fullWidth>
        <InputLabel>Status</InputLabel>
        <Select
          value={condition.status || 'active'}
          onChange={(e) =>
            setEditingItem((prev) => ({
              ...prev!,
              item: { ...prev!.item, status: e.target.value },
            }))
          }
        >
          <MenuItem value="active">Active</MenuItem>
          <MenuItem value="managed">Managed</MenuItem>
          <MenuItem value="resolved">Resolved</MenuItem>
        </Select>
      </FormControl>
      <TextField
        label="Symptoms (comma-separated)"
        value={condition.symptoms?.join(', ') || ''}
        onChange={(e) =>
          setEditingItem((prev) => ({
            ...prev!,
            item: {
              ...prev!.item,
              symptoms: e.target.value.split(',').map((s) => s.trim()),
            },
          }))
        }
        fullWidth
      />
      <TextField
        label="Treatments (comma-separated)"
        value={condition.treatments?.join(', ') || ''}
        onChange={(e) =>
          setEditingItem((prev) => ({
            ...prev!,
            item: {
              ...prev!.item,
              treatments: e.target.value.split(',').map((s) => s.trim()),
            },
          }))
        }
        fullWidth
      />
      <TextField
        label="Diagnosed Date"
        type="date"
        value={condition.diagnosedDate?.split('T')[0] || ''}
        onChange={(e) =>
          setEditingItem((prev) => ({
            ...prev!,
            item: { ...prev!.item, diagnosedDate: e.target.value },
          }))
        }
        fullWidth
        InputLabelProps={{ shrink: true }}
      />
    </Box>
  );

  const renderAllergyForm = (allergy: Partial<Allergy>) => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <TextField
        label="Allergen"
        value={allergy.allergen || ''}
        onChange={(e) =>
          setEditingItem((prev) => ({
            ...prev!,
            item: { ...prev!.item, allergen: e.target.value },
          }))
        }
        fullWidth
        required
      />
      <FormControl fullWidth>
        <InputLabel>Severity</InputLabel>
        <Select
          value={allergy.severity || 'moderate'}
          onChange={(e) =>
            setEditingItem((prev) => ({
              ...prev!,
              item: { ...prev!.item, severity: e.target.value },
            }))
          }
        >
          <MenuItem value="mild">Mild</MenuItem>
          <MenuItem value="moderate">Moderate</MenuItem>
          <MenuItem value="severe">Severe</MenuItem>
        </Select>
      </FormControl>
      <TextField
        label="Reactions (comma-separated)"
        value={allergy.reactions?.join(', ') || ''}
        onChange={(e) =>
          setEditingItem((prev) => ({
            ...prev!,
            item: {
              ...prev!.item,
              reactions: e.target.value.split(',').map((s) => s.trim()),
            },
          }))
        }
        fullWidth
      />
      <TextField
        label="Diagnosed Date"
        type="date"
        value={allergy.diagnosed?.split('T')[0] || ''}
        onChange={(e) =>
          setEditingItem((prev) => ({
            ...prev!,
            item: { ...prev!.item, diagnosed: e.target.value },
          }))
        }
        fullWidth
        InputLabelProps={{ shrink: true }}
      />
    </Box>
  );

  return (
    <Box>
      {validationIssues.length > 0 && (
        <Alert 
          severity="warning" 
          icon={<WarningIcon />}
          sx={{ mb: 2 }}
        >
          <Typography variant="subtitle1" gutterBottom>
            Medical Information Issues Detected
          </Typography>
          <List dense>
            {validationIssues.map((issue, index) => (
              <ListItem key={index}>
                <Typography variant="body2">{issue}</Typography>
              </ListItem>
            ))}
          </List>
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Medications</Typography>
                {!readOnly && (
                  <IconButton
                    onClick={() => handleAddItem('medication')}
                    color="primary"
                    aria-label="Add medication"
                  >
                    <AddIcon />
                  </IconButton>
                )}
              </Box>
              <List>
                {medicalInfo.medications.map((med) => (
                  <ListItem
                    key={med.id}
                    secondaryAction={
                      !readOnly && (
                        <Box>
                          <IconButton
                            edge="end"
                            aria-label="edit"
                            onClick={() => handleEditItem('medication', med)}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            edge="end"
                            aria-label="delete"
                            onClick={() => handleDeleteItem('medication', med.id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      )
                    }
                  >
                    <ListItem>
                      <Typography variant="subtitle1">{med.name}</Typography>
                      <Typography variant="body2" color="textSecondary">
                        {med.dosage} - {med.frequency}
                      </Typography>
                    </ListItem>
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Conditions</Typography>
                {!readOnly && (
                  <IconButton
                    onClick={() => handleAddItem('condition')}
                    color="primary"
                    aria-label="Add condition"
                  >
                    <AddIcon />
                  </IconButton>
                )}
              </Box>
              <List>
                {medicalInfo.conditions.map((condition) => (
                  <ListItem
                    key={condition.id}
                    secondaryAction={
                      !readOnly && (
                        <Box>
                          <IconButton
                            edge="end"
                            aria-label="edit"
                            onClick={() => handleEditItem('condition', condition)}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            edge="end"
                            aria-label="delete"
                            onClick={() => handleDeleteItem('condition', condition.id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      )
                    }
                  >
                    <ListItem>
                      <Typography variant="subtitle1">{condition.name}</Typography>
                      <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                        <Chip
                          label={condition.severity}
                          size="small"
                          color={
                            condition.severity === 'severe'
                              ? 'error'
                              : condition.severity === 'moderate'
                              ? 'warning'
                              : 'success'
                          }
                        />
                        <Chip label={condition.status} size="small" />
                      </Box>
                    </ListItem>
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Allergies</Typography>
                {!readOnly && (
                  <IconButton
                    onClick={() => handleAddItem('allergy')}
                    color="primary"
                    aria-label="Add allergy"
                  >
                    <AddIcon />
                  </IconButton>
                )}
              </Box>
              <List>
                {medicalInfo.allergies.map((allergy) => (
                  <ListItem
                    key={allergy.id}
                    secondaryAction={
                      !readOnly && (
                        <Box>
                          <IconButton
                            edge="end"
                            aria-label="edit"
                            onClick={() => handleEditItem('allergy', allergy)}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            edge="end"
                            aria-label="delete"
                            onClick={() => handleDeleteItem('allergy', allergy.id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      )
                    }
                  >
                    <ListItem>
                      <Typography variant="subtitle1">{allergy.allergen}</Typography>
                      <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                        <Chip
                          label={allergy.severity}
                          size="small"
                          color={
                            allergy.severity === 'severe'
                              ? 'error'
                              : allergy.severity === 'moderate'
                              ? 'warning'
                              : 'success'
                          }
                        />
                      </Box>
                    </ListItem>
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingItem
            ? `Edit ${editingItem.type.charAt(0).toUpperCase() + editingItem.type.slice(1)}`
            : 'Add New Item'}
        </DialogTitle>
        <DialogContent>
          {editingItem?.type === 'medication' && renderMedicationForm(editingItem.item as Partial<Medication>)}
          {editingItem?.type === 'condition' && renderConditionForm(editingItem.item as Partial<MedicalCondition>)}
          {editingItem?.type === 'allergy' && renderAllergyForm(editingItem.item as Partial<Allergy>)}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleSaveItem} variant="contained" color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
