import React from 'react';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { MedicationList } from '../MedicationList';
import { ThemeProvider, createTheme } from '@mui/material';

expect.extend(toHaveNoViolations);

const mockMedications = [
  {
    id: '1',
    name: 'Test Medication',
    dosage: '10mg',
    frequency: 'daily',
    startDate: new Date('2024-01-01'),
    prescribedBy: 'Dr. Smith',
    instructions: 'Take with food',
  },
];

const mockOnEdit = jest.fn();
const mockOnDelete = jest.fn();

const renderWithTheme = (component: React.ReactElement) => {
  const theme = createTheme({
    palette: {
      mode: 'light',
    },
  });
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('MedicationList Accessibility', () => {
  it('should have no accessibility violations', async () => {
    const { container } = renderWithTheme(
      <MedicationList
        medications={mockMedications}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have proper region labeling', () => {
    renderWithTheme(
      <MedicationList
        medications={mockMedications}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );
    
    expect(screen.getByRole('region', { name: /medications list/i })).toBeInTheDocument();
  });

  it('should have accessible action buttons', () => {
    renderWithTheme(
      <MedicationList
        medications={mockMedications}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );
    
    expect(screen.getByRole('button', { name: /edit test medication/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete test medication/i })).toBeInTheDocument();
  });

  it('should display empty state message accessibly', () => {
    renderWithTheme(
      <MedicationList
        medications={[]}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );
    
    const emptyMessage = screen.getByRole('status');
    expect(emptyMessage).toBeInTheDocument();
    expect(emptyMessage).toHaveTextContent(/no medications found/i);
  });
});
