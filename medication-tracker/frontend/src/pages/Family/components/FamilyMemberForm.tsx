import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  FormControlLabel,
  Switch,
  Chip,
  Box,
  MenuItem,
  useTheme,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import type { FamilyMember } from '../../../store/services/familyApi';

interface FamilyMemberFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<FamilyMember>) => Promise<void>;
  member?: FamilyMember;
}

const relationships = [
  'Spouse',
  'Child',
  'Parent',
  'Sibling',
  'Grandparent',
  'Other',
];

const schema = yup.object().shape({
  firstName: yup.string().required('First name is required'),
  lastName: yup.string().required('Last name is required'),
  dateOfBirth: yup.date().required('Date of birth is required'),
  relationship: yup.string().required('Relationship is required'),
  allergies: yup.array().of(yup.string()),
  medicalConditions: yup.array().of(yup.string()),
  emergencyContact: yup.object().shape({
    name: yup.string().required('Emergency contact name is required'),
    phone: yup.string().required('Emergency contact phone is required'),
    relationship: yup.string().required('Emergency contact relationship is required'),
  }),
  permissions: yup.object().shape({
    canView: yup.boolean(),
    canEdit: yup.boolean(),
    canDelete: yup.boolean(),
    canManageMedications: yup.boolean(),
  }),
});

const FamilyMemberForm: React.FC<FamilyMemberFormProps> = ({
  open,
  onClose,
  onSubmit,
  member,
}) => {
  const theme = useTheme();
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      firstName: '',
      lastName: '',
      dateOfBirth: new Date(),
      relationship: '',
      allergies: [],
      medicalConditions: [],
      emergencyContact: {
        name: '',
        phone: '',
        relationship: '',
      },
      permissions: {
        canView: true,
        canEdit: false,
        canDelete: false,
        canManageMedications: false,
      },
      ...member,
    },
  });

  React.useEffect(() => {
    if (member) {
      reset({
        ...member,
        dateOfBirth: new Date(member.dateOfBirth),
      });
    }
  }, [member, reset]);

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: theme.shape.borderRadius,
        },
      }}
    >
      <DialogTitle>
        {member ? 'Edit Family Member' : 'Add Family Member'}
      </DialogTitle>

      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Controller
                name="firstName"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="First Name"
                    fullWidth
                    error={!!errors.firstName}
                    helperText={errors.firstName?.message}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="lastName"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Last Name"
                    fullWidth
                    error={!!errors.lastName}
                    helperText={errors.lastName?.message}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="dateOfBirth"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    label="Date of Birth"
                    value={field.value}
                    onChange={(date) => field.onChange(date)}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        error: !!errors.dateOfBirth,
                        helperText: errors.dateOfBirth?.message,
                      },
                    }}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="relationship"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    label="Relationship"
                    fullWidth
                    error={!!errors.relationship}
                    helperText={errors.relationship?.message}
                  >
                    {relationships.map((rel) => (
                      <MenuItem key={rel} value={rel}>
                        {rel}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ mb: 2 }}>
                <Controller
                  name="allergies"
                  control={control}
                  render={({ field }) => (
                    <>
                      <TextField
                        label="Allergies"
                        fullWidth
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const input = e.target as HTMLInputElement;
                            if (input.value.trim()) {
                              field.onChange([...field.value, input.value.trim()]);
                              input.value = '';
                            }
                          }
                        }}
                      />
                      <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {field.value.map((allergy, index) => (
                          <Chip
                            key={index}
                            label={allergy}
                            onDelete={() => {
                              const newAllergies = [...field.value];
                              newAllergies.splice(index, 1);
                              field.onChange(newAllergies);
                            }}
                          />
                        ))}
                      </Box>
                    </>
                  )}
                />
              </Box>
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ mb: 2 }}>
                <Controller
                  name="medicalConditions"
                  control={control}
                  render={({ field }) => (
                    <>
                      <TextField
                        label="Medical Conditions"
                        fullWidth
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const input = e.target as HTMLInputElement;
                            if (input.value.trim()) {
                              field.onChange([...field.value, input.value.trim()]);
                              input.value = '';
                            }
                          }
                        }}
                      />
                      <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {field.value.map((condition, index) => (
                          <Chip
                            key={index}
                            label={condition}
                            onDelete={() => {
                              const newConditions = [...field.value];
                              newConditions.splice(index, 1);
                              field.onChange(newConditions);
                            }}
                          />
                        ))}
                      </Box>
                    </>
                  )}
                />
              </Box>
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ p: 2, border: `1px solid ${theme.palette.divider}`, borderRadius: 1 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Controller
                      name="emergencyContact.name"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Emergency Contact Name"
                          fullWidth
                          error={!!errors.emergencyContact?.name}
                          helperText={errors.emergencyContact?.name?.message}
                        />
                      )}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="emergencyContact.phone"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Emergency Contact Phone"
                          fullWidth
                          error={!!errors.emergencyContact?.phone}
                          helperText={errors.emergencyContact?.phone?.message}
                        />
                      )}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="emergencyContact.relationship"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Emergency Contact Relationship"
                          fullWidth
                          error={!!errors.emergencyContact?.relationship}
                          helperText={errors.emergencyContact?.relationship?.message}
                        />
                      )}
                    />
                  </Grid>
                </Grid>
              </Box>
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ p: 2, border: `1px solid ${theme.palette.divider}`, borderRadius: 1 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="permissions.canView"
                      control={control}
                      render={({ field }) => (
                        <FormControlLabel
                          control={
                            <Switch
                              checked={field.value}
                              onChange={(e) => field.onChange(e.target.checked)}
                            />
                          }
                          label="Can View"
                        />
                      )}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="permissions.canEdit"
                      control={control}
                      render={({ field }) => (
                        <FormControlLabel
                          control={
                            <Switch
                              checked={field.value}
                              onChange={(e) => field.onChange(e.target.checked)}
                            />
                          }
                          label="Can Edit"
                        />
                      )}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="permissions.canDelete"
                      control={control}
                      render={({ field }) => (
                        <FormControlLabel
                          control={
                            <Switch
                              checked={field.value}
                              onChange={(e) => field.onChange(e.target.checked)}
                            />
                          }
                          label="Can Delete"
                        />
                      )}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="permissions.canManageMedications"
                      control={control}
                      render={({ field }) => (
                        <FormControlLabel
                          control={
                            <Switch
                              checked={field.value}
                              onChange={(e) => field.onChange(e.target.checked)}
                            />
                          }
                          label="Can Manage Medications"
                        />
                      )}
                    />
                  </Grid>
                </Grid>
              </Box>
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={isSubmitting}
          >
            {member ? 'Update' : 'Add'} Family Member
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default FamilyMemberForm;
