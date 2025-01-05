import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material';
import MedicationStats from '../MedicationStats';

const theme = createTheme();

describe('MedicationStats', () => {
  const defaultProps = {
    totalMedications: 10,
    activeMedications: 5,
    upcomingRefills: 2,
  };

  const renderComponent = (props = defaultProps) => {
    return render(
      <ThemeProvider theme={theme}>
        <MedicationStats {...props} />
      </ThemeProvider>
    );
  };

  it('renders all statistics correctly', () => {
    renderComponent();

    expect(screen.getByText('Total Medications')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();

    expect(screen.getByText('Active Medications')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();

    expect(screen.getByText('Upcoming Refills')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('handles zero values correctly', () => {
    renderComponent({
      totalMedications: 0,
      activeMedications: 0,
      upcomingRefills: 0,
    });

    const zeros = screen.getAllByText('0');
    expect(zeros).toHaveLength(3);
  });
});
