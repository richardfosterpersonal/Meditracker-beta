import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders, mockDoseLogs } from '../../test-utils/test-utils';
import AdherenceTrendChart from './AdherenceTrendChart';

describe('AdherenceTrendChart', () => {
  const defaultProps = {
    doseLogs: mockDoseLogs,
    timeRange: 'week',
    onTimeRangeChange: jest.fn(),
  };

  it('renders without crashing', () => {
    renderWithProviders(<AdherenceTrendChart {...defaultProps} />);
    expect(screen.getByText('Adherence Trend')).toBeInTheDocument();
  });

  it('displays time range toggle buttons', () => {
    renderWithProviders(<AdherenceTrendChart {...defaultProps} />);
    expect(screen.getByRole('button', { name: /week/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /month/i })).toBeInTheDocument();
  });

  it('calls onTimeRangeChange when time range is changed', () => {
    renderWithProviders(<AdherenceTrendChart {...defaultProps} />);
    const monthButton = screen.getByRole('button', { name: /month/i });
    fireEvent.click(monthButton);
    expect(defaultProps.onTimeRangeChange).toHaveBeenCalledWith('month');
  });

  it('displays average adherence rate', () => {
    renderWithProviders(<AdherenceTrendChart {...defaultProps} />);
    expect(screen.getByText('Average Adherence')).toBeInTheDocument();
  });

  it('displays total doses', () => {
    renderWithProviders(<AdherenceTrendChart {...defaultProps} />);
    expect(screen.getByText('Total Doses')).toBeInTheDocument();
  });

  it('displays doses taken', () => {
    renderWithProviders(<AdherenceTrendChart {...defaultProps} />);
    expect(screen.getByText('Doses Taken')).toBeInTheDocument();
  });

  it('renders with empty dose logs', () => {
    renderWithProviders(
      <AdherenceTrendChart
        {...defaultProps}
        doseLogs={[]}
      />
    );
    expect(screen.getByText('Adherence Trend')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('handles weekly time range correctly', () => {
    renderWithProviders(
      <AdherenceTrendChart
        {...defaultProps}
        timeRange="week"
      />
    );
    expect(screen.getByRole('button', { name: /week/i })).toHaveAttribute('aria-pressed', 'true');
  });

  it('handles monthly time range correctly', () => {
    renderWithProviders(
      <AdherenceTrendChart
        {...defaultProps}
        timeRange="month"
      />
    );
    expect(screen.getByRole('button', { name: /month/i })).toHaveAttribute('aria-pressed', 'true');
  });
});
