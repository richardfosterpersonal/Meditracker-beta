import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Stack,
    Alert,
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker, TimePicker } from '@mui/x-date-pickers';
import { AxiosError } from 'axios';
import axiosInstance from '../../services/api';
import { 
    AddMedicationProps, 
    MedicationFormData, 
    MedicationFrequency 
} from '../../types/medication';

const AddMedication: React.FC<AddMedicationProps> = ({ 
    open, 
    handleClose, 
    onMedicationAdded 
}) => {
    const [formData, setFormData] = useState<MedicationFormData>({
        name: '',
        dosage: '',
        frequency: 'daily',
        startDate: new Date(),
        reminderTime: new Date(),
        instructions: '',
        category: '',
    });
    const [error, setError] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);

    const handleChange = (
        e: React.ChangeEvent<{ name?: string; value: unknown }>
    ): void => {
        const name = e.target.name as keyof MedicationFormData;
        const value = e.target.value as string;
        
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleDateChange = (date: Date | null): void => {
        if (date) {
            setFormData(prev => ({
                ...prev,
                startDate: date
            }));
        }
    };

    const handleTimeChange = (time: Date | null): void => {
        if (time) {
            setFormData(prev => ({
                ...prev,
                reminderTime: time
            }));
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // Combine date and time for the backend's time field
            const timeDate = new Date(formData.startDate);
            const reminderTime = new Date(formData.reminderTime);
            timeDate.setHours(reminderTime.getHours());
            timeDate.setMinutes(reminderTime.getMinutes());

            const response = await axiosInstance.post('/medications/', {
                name: formData.name,
                dosage: formData.dosage,
                frequency: formData.frequency,
                time: timeDate.toISOString(),
                notes: formData.instructions,
                category: formData.category
            });

            if (response.status === 201) {
                onMedicationAdded(response.data);
                handleClose();
            }
        } catch (err) {
            console.error('Error adding medication:', err);
            const error = err as AxiosError;
            setError(
                error.response?.data?.error || 
                'Failed to add medication'
            );
        } finally {
            setLoading(false);
        }
    };

    const frequencies: { label: string; value: MedicationFrequency }[] = [
        { label: 'Daily', value: 'daily' },
        { label: 'Twice Daily', value: 'twice_daily' },
        { label: 'Weekly', value: 'weekly' },
        { label: 'Monthly', value: 'monthly' },
        { label: 'As Needed', value: 'as_needed' },
    ];

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>Add New Medication</DialogTitle>
            <form onSubmit={handleSubmit}>
                <DialogContent>
                    <Stack spacing={3}>
                        {error && <Alert severity="error">{error}</Alert>}
                        
                        <TextField
                            required
                            name="name"
                            label="Medication Name"
                            value={formData.name}
                            onChange={handleChange}
                            fullWidth
                        />

                        <TextField
                            required
                            name="dosage"
                            label="Dosage"
                            value={formData.dosage}
                            onChange={handleChange}
                            fullWidth
                        />

                        <FormControl fullWidth>
                            <InputLabel>Frequency</InputLabel>
                            <Select
                                required
                                name="frequency"
                                value={formData.frequency}
                                onChange={handleChange}
                                label="Frequency"
                            >
                                {frequencies.map(({ label, value }) => (
                                    <MenuItem key={value} value={value}>
                                        {label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <LocalizationProvider dateAdapter={AdapterDateFns}>
                            <DatePicker
                                label="Start Date"
                                value={formData.startDate}
                                onChange={handleDateChange}
                                renderInput={(params) => (
                                    <TextField {...params} fullWidth />
                                )}
                            />
                            
                            <TimePicker
                                label="Reminder Time"
                                value={formData.reminderTime}
                                onChange={handleTimeChange}
                                renderInput={(params) => (
                                    <TextField {...params} fullWidth />
                                )}
                            />
                        </LocalizationProvider>

                        <TextField
                            name="category"
                            label="Category"
                            value={formData.category}
                            onChange={handleChange}
                            fullWidth
                        />

                        <TextField
                            name="instructions"
                            label="Instructions"
                            value={formData.instructions}
                            onChange={handleChange}
                            multiline
                            rows={4}
                            fullWidth
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose}>Cancel</Button>
                    <Button 
                        type="submit" 
                        variant="contained" 
                        disabled={loading}
                    >
                        {loading ? 'Adding...' : 'Add Medication'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
};

export default AddMedication;
