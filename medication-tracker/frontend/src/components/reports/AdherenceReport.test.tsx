import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders, mockDoseLogs, mockSchedules } from '../../test-utils/test-utils';
import AdherenceReport from './AdherenceReport';

describe('AdherenceReport', () => {
  const defaultProps = {
    schedules: mockSchedules,
    doseLogs: mockDoseLogs,
    startDate: new Date('2024-12-01'),
    endDate: new Date('2024-12-08'),
  };

  it('renders without crashing', () => {
    renderWithProviders(<AdherenceReport {...defaultProps} />);
    expect(screen.getByText(/Adherence Report/)).toBeInTheDocument();
  });

  it('displays export button', () => {
    renderWithProviders(<AdherenceReport {...defaultProps} />);
    expect(screen.getByRole('button', { name: /export report/i })).toBeInTheDocument();
  });

  it('displays medication names in the table', () => {
    renderWithProviders(<AdherenceReport {...defaultProps} />);
    mockSchedules.forEach(schedule => {
      expect(screen.getByText(schedule.medicationName)).toBeInTheDocument();
    });
  });

  it('displays table headers correctly', () => {
    renderWithProviders(<AdherenceReport {...defaultProps} />);
    const expectedHeaders = [
      'Medication',
      'Total Doses',
      'Taken',
      'Missed',
      'Late',
      'Adherence Rate',
    ];
    expectedHeaders.forEach(header => {
      expect(screen.getByText(header)).toBeInTheDocument();
    });
  });

  it('handles empty schedules', () => {
    renderWithProviders(
      <AdherenceReport
        {...defaultProps}
        schedules={[]}
      />
    );
    expect(screen.getByText(/Adherence Report/)).toBeInTheDocument();
  });

  it('handles empty dose logs', () => {
    renderWithProviders(
      <AdherenceReport
        {...defaultProps}
        doseLogs={[]}
      />
    );
    expect(screen.getByText(/Adherence Report/)).toBeInTheDocument();
  });

  it('displays correct date range in title', () => {
    renderWithProviders(<AdherenceReport {...defaultProps} />);
    expect(screen.getByText(/Dec 1.*Dec 8, 2024/)).toBeInTheDocument();
  });

  it('calculates statistics correctly for each medication', () => {
    renderWithProviders(<AdherenceReport {...defaultProps} />);
    
    // Check Medication A statistics
    const medicationARow = screen.getByText('Medication A').closest('tr');
    expect(medicationARow).toBeInTheDocument();
    if (medicationARow) {
      expect(medicationARow).toHaveTextContent('2'); // Total doses
      expect(medicationARow).toHaveTextContent('1'); // Taken
      expect(medicationARow).toHaveTextContent('1'); // Missed
    }

    // Check Medication B statistics
    const medicationBRow = screen.getByText('Medication B').closest('tr');
    expect(medicationBRow).toBeInTheDocument();
    if (medicationBRow) {
      expect(medicationBRow).toHaveTextContent('1'); // Total doses
      expect(medicationBRow).toHaveTextContent('0'); // Taken
      expect(medicationBRow).toHaveTextContent('0'); // Missed
      expect(medicationBRow).toHaveTextContent('1'); // Late
    }
  });

  // Test export functionality
  it('triggers file download when export button is clicked', () => {
    // Mock URL.createObjectURL and document.createElement
    const mockUrl = 'blob:test';
    const mockCreateObjectURL = jest.fn(() => mockUrl);
    const mockRevokeObjectURL = jest.fn();
    URL.createObjectURL = mockCreateObjectURL;
    URL.revokeObjectURL = mockRevokeObjectURL;

    const mockLink = {
      click: jest.fn(),
      href: '',
      download: '',
    };
    jest.spyOn(document, 'createElement').mockImplementation(() => mockLink as any);
    jest.spyOn(document.body, 'appendChild').mockImplementation(() => {});
    jest.spyOn(document.body, 'removeChild').mockImplementation(() => {});

    renderWithProviders(<AdherenceReport {...defaultProps} />);
    const exportButton = screen.getByRole('button', { name: /export report/i });
    fireEvent.click(exportButton);

    expect(mockCreateObjectURL).toHaveBeenCalled();
    expect(mockLink.click).toHaveBeenCalled();
    expect(mockRevokeObjectURL).toHaveBeenCalledWith(mockUrl);
  });
});
