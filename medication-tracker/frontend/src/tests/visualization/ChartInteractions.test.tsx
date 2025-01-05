import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test-utils/test-utils';
import AdherenceTrendChart from '../../components/charts/AdherenceTrendChart';
import AdherenceReport from '../../components/reports/AdherenceReport';

const mockDoseLogs = [
  {
    id: '1',
    scheduleId: '1',
    status: 'taken',
    scheduledTime: '2024-12-08T08:00:00.000Z',
    takenTime: '2024-12-08T08:05:00.000Z',
  },
  {
    id: '2',
    scheduleId: '1',
    status: 'missed',
    scheduledTime: '2024-12-08T20:00:00.000Z',
  },
];

const mockSchedules = [
  {
    id: '1',
    medicationName: 'Test Medication',
    dosage: '10mg',
    frequency: { type: 'daily', times: ['08:00', '20:00'] },
    status: 'active',
  },
];

describe('Chart Interaction Tests', () => {
  describe('AdherenceTrendChart Interactions', () => {
    const defaultProps = {
      doseLogs: mockDoseLogs,
      timeRange: 'week',
      onTimeRangeChange: jest.fn(),
    };

    it('handles touch events on chart elements', async () => {
      renderWithProviders(<AdherenceTrendChart {...defaultProps} />);
      
      // Find and interact with chart elements
      const chartArea = screen.getByRole('graphics-document');
      fireEvent.touchStart(chartArea, { touches: [{ clientX: 100, clientY: 100 }] });
      fireEvent.touchMove(chartArea, { touches: [{ clientX: 150, clientY: 100 }] });
      fireEvent.touchEnd(chartArea);

      // Verify tooltip behavior
      await waitFor(() => {
        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
      });
    });

    it('maintains responsive layout on window resize', async () => {
      const { container } = renderWithProviders(<AdherenceTrendChart {...defaultProps} />);
      
      // Trigger resize event
      global.innerWidth = 500;
      fireEvent(window, new Event('resize'));

      // Check if chart container adjusts
      const chartContainer = container.querySelector('.recharts-responsive-container');
      expect(chartContainer).toHaveStyle({ width: '100%' });
    });

    it('handles keyboard navigation in time range toggle', async () => {
      renderWithProviders(<AdherenceTrendChart {...defaultProps} />);
      
      const weekButton = screen.getByRole('button', { name: /week/i });
      const monthButton = screen.getByRole('button', { name: /month/i });

      // Test keyboard navigation
      weekButton.focus();
      fireEvent.keyDown(weekButton, { key: 'ArrowRight' });
      expect(monthButton).toHaveFocus();
    });
  });

  describe('AdherenceReport Interactions', () => {
    const defaultProps = {
      schedules: mockSchedules,
      doseLogs: mockDoseLogs,
      startDate: new Date('2024-12-01'),
      endDate: new Date('2024-12-08'),
    };

    it('handles pie chart segment interactions', async () => {
      renderWithProviders(<AdherenceReport {...defaultProps} />);
      
      const pieChart = screen.getByRole('graphics-document');
      
      // Simulate hover on pie segment
      fireEvent.mouseOver(pieChart);
      
      // Check if tooltip appears
      await waitFor(() => {
        expect(screen.queryByRole('tooltip')).toBeInTheDocument();
      });
    });

    it('maintains table layout on different screen sizes', async () => {
      const { container } = renderWithProviders(<AdherenceReport {...defaultProps} />);
      
      // Simulate mobile viewport
      global.innerWidth = 375;
      fireEvent(window, new Event('resize'));

      // Check if table becomes scrollable
      const tableContainer = container.querySelector('.MuiTableContainer-root');
      expect(tableContainer).toHaveStyle({ overflowX: 'auto' });
    });

    it('handles export functionality with touch events', async () => {
      // Mock file download functionality
      const mockCreateObjectURL = jest.fn();
      const mockRevokeObjectURL = jest.fn();
      URL.createObjectURL = mockCreateObjectURL;
      URL.revokeObjectURL = mockRevokeObjectURL;

      renderWithProviders(<AdherenceReport {...defaultProps} />);
      
      const exportButton = screen.getByRole('button', { name: /export report/i });
      await userEvent.click(exportButton);

      expect(mockCreateObjectURL).toHaveBeenCalled();
    });

    it('maintains accessibility during interactions', async () => {
      const { container } = renderWithProviders(<AdherenceReport {...defaultProps} />);
      
      // Test focus management
      const interactiveElements = container.querySelectorAll('button, [role="button"]');
      interactiveElements.forEach(element => {
        element.focus();
        expect(document.activeElement).toBe(element);
      });
    });
  });

  describe('Mobile Touch Interaction Tests', () => {
    it('handles touch gestures on charts', async () => {
      const { container } = renderWithProviders(
        <AdherenceTrendChart
          doseLogs={mockDoseLogs}
          timeRange="week"
          onTimeRangeChange={jest.fn()}
        />
      );

      const chart = container.querySelector('.recharts-wrapper');
      expect(chart).toBeInTheDocument();

      // Simulate touch gesture
      fireEvent.touchStart(chart!, { touches: [{ clientX: 100, clientY: 100 }] });
      fireEvent.touchMove(chart!, { touches: [{ clientX: 150, clientY: 100 }] });
      fireEvent.touchEnd(chart!);

      // Verify chart remains interactive
      expect(chart).toBeInTheDocument();
    });

    it('supports pinch-to-zoom gesture on charts', async () => {
      const { container } = renderWithProviders(
        <AdherenceTrendChart
          doseLogs={mockDoseLogs}
          timeRange="week"
          onTimeRangeChange={jest.fn()}
        />
      );

      const chart = container.querySelector('.recharts-wrapper');
      
      // Simulate pinch gesture
      fireEvent.touchStart(chart!, {
        touches: [
          { clientX: 100, clientY: 100 },
          { clientX: 200, clientY: 100 },
        ],
      });

      fireEvent.touchMove(chart!, {
        touches: [
          { clientX: 50, clientY: 100 },
          { clientX: 250, clientY: 100 },
        ],
      });

      fireEvent.touchEnd(chart!);

      // Verify chart remains responsive
      expect(chart).toBeInTheDocument();
    });
  });
});
