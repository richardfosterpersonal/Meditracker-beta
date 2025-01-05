import React from 'react';
import {
  Paper,
  TextField,
  Grid,
  MenuItem,
  InputAdornment,
  useTheme,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

interface FiltersState {
  search: string;
  category: string;
  status: string;
}

interface MedicationFiltersProps {
  filters: FiltersState;
  onFilterChange: (filters: FiltersState) => void;
}

const categories = [
  { value: 'all', label: 'All Categories' },
  { value: 'Prescription', label: 'Prescription' },
  { value: 'Over-the-counter', label: 'Over-the-counter' },
  { value: 'Supplement', label: 'Supplement' },
  { value: 'Vitamin', label: 'Vitamin' },
  { value: 'Other', label: 'Other' },
];

const statuses = [
  { value: 'all', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'paused', label: 'Paused' },
];

const MedicationFilters: React.FC<MedicationFiltersProps> = ({
  filters,
  onFilterChange,
}) => {
  const theme = useTheme();

  const handleChange = (field: keyof FiltersState) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    onFilterChange({
      ...filters,
      [field]: event.target.value,
    });
  };

  return (
    <Paper
      sx={{
        p: 2,
        mb: 3,
        borderRadius: theme.shape.borderRadius,
      }}
      elevation={0}
      variant="outlined"
    >
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            fullWidth
            label="Search Medications"
            value={filters.search}
            onChange={handleChange('search')}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <TextField
            select
            fullWidth
            label="Category"
            value={filters.category}
            onChange={handleChange('category')}
          >
            {categories.map((category) => (
              <MenuItem key={category.value} value={category.value}>
                {category.label}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <TextField
            select
            fullWidth
            label="Status"
            value={filters.status}
            onChange={handleChange('status')}
          >
            {statuses.map((status) => (
              <MenuItem key={status.value} value={status.value}>
                {status.label}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default MedicationFilters;
