import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material';
import { addHours, subHours } from 'date-fns';
import UpcomingMedications from '../UpcomingMedications';

const theme = createTheme();

describe('UpcomingMedications', () => {
  const now = new Date();
  const mockMedications = [
    {
      id: '1',
      name: 'Medication 1',
      dosage: '10mg',
      nextDose: addHours(now, 2).toISOString(),
      instructions: 'Take with food',
      status: 'active',
    },
    {
      id: '2',
      name: 'Medication 2',
      dosage: '20mg',
      nextDose: addHours(now, 4).toISOString(),
      instructions: 'Take before bed',
      status: 'active',
    },
    {
      id: '3',
      name: 'Medication 3',
      dosage: '30mg',
      nextDose: subHours(now, 2).toISOString(), // Past medication
      instructions: 'Take with water',
      status: 'active',
    },
    {
      id: '4',
      name: 'Medication 4',
      dosage: '40mg',
      nextDose: addHours(now, 1).toISOString(),
      instructions: null,
      status: 'inactive',
    },
  ];

  const renderComponent = (medications = mockMedications) => {
    return render(
      <ThemeProvider theme={theme}>
        <UpcomingMedications medications={medications} />
      </ThemeProvider>
    );
  };

  it('renders upcoming medications correctly', () => {
    renderComponent();

    // Should show active future medications
    expect(screen.getByText('Medication 1')).toBeInTheDocument();
    expect(screen.getByText('Medication 2')).toBeInTheDocument();

    // Should not show past medications
    expect(screen.queryByText('Medication 3')).not.toBeInTheDocument();

    // Should not show inactive medications
    expect(screen.queryByText('Medication 4')).not.toBeInTheDocument();
  });

  it('displays medication details correctly', () => {
    renderComponent();

    expect(screen.getByText('10mg')).toBeInTheDocument();
    expect(screen.getByText('Take with food')).toBeInTheDocument();
  });

  it('handles medications with no instructions', () => {
    const medicationsWithoutInstructions = [
      {
        id: '1',
        name: 'Test Med',
        dosage: '10mg',
        nextDose: addHours(now, 1).toISOString(),
        instructions: null,
        status: 'active',
      },
    ];

    renderComponent(medicationsWithoutInstructions);
    expect(screen.getByText('Test Med')).toBeInTheDocument();
    expect(screen.getByText('10mg')).toBeInTheDocument();
  });

  it('displays empty state when no upcoming medications', () => {
    renderComponent([]);
    expect(screen.getByText('No upcoming medications')).toBeInTheDocument();
  });

  it('shows only active medications', () => {
    const mixedMedications = [
      {
        id: '1',
        name: 'Active Med',
        dosage: '10mg',
        nextDose: addHours(now, 1).toISOString(),
        instructions: null,
        status: 'active',
      },
      {
        id: '2',
        name: 'Inactive Med',
        dosage: '20mg',
        nextDose: addHours(now, 2).toISOString(),
        instructions: null,
        status: 'inactive',
      },
    ];

    renderComponent(mixedMedications);
    expect(screen.getByText('Active Med')).toBeInTheDocument();
    expect(screen.queryByText('Inactive Med')).not.toBeInTheDocument();
  });
});
