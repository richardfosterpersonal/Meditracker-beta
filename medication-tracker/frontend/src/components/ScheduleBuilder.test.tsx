import React from 'react';
import { render, screen, fireEvent, waitFor } from '../setupTests';
import { ScheduleBuilder } from './ScheduleBuilder';
import { ScheduleType } from '../types/schedule';
import { mockToast } from '../setupTests';
import '@testing-library/jest-dom';

// Mock ConflictResolution component
jest.mock('./ConflictResolution', () => ({
  ConflictResolution: ({ onResolve }: { onResolve: (resolution: string) => void }) => (
    <div data-testid="conflict-resolution">
      <button onClick={() => onResolve('keep')}>Keep</button>
      <button onClick={() => onResolve('replace')}>Replace</button>
    </div>
  ),
}));

// Mock Chakra icons
jest.mock('@chakra-ui/icons', () => ({
  TimeIcon: () => <div data-testid="time-icon" />,
}));

describe('ScheduleBuilder', () => {
  const mockOnScheduleChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with default schedule type', () => {
    render(<ScheduleBuilder onScheduleChange={mockOnScheduleChange} />);
    expect(screen.getByLabelText(/schedule type/i)).toBeInTheDocument();
  });

  it('renders with initial schedule', () => {
    const initialSchedule = {
      type: ScheduleType.FIXED_TIME,
      timeSlots: ['09:00'],
    };
    render(<ScheduleBuilder onScheduleChange={mockOnScheduleChange} initialSchedule={initialSchedule} />);
    expect(screen.getByDisplayValue('09:00')).toBeInTheDocument();
  });

  describe('Fixed Time Schedule', () => {
    beforeEach(() => {
      render(<ScheduleBuilder onScheduleChange={mockOnScheduleChange} />);
      const select = screen.getByLabelText(/schedule type/i);
      fireEvent.change(select, { target: { value: ScheduleType.FIXED_TIME } });
    });

    it('allows adding and removing time slots', async () => {
      const addButton = screen.getByRole('button', { name: /add time/i });
      fireEvent.click(addButton);

      const timeInput = screen.getByLabelText(/time slot/i);
      fireEvent.change(timeInput, { target: { value: '10:00' } });

      await waitFor(() => {
        expect(mockOnScheduleChange).toHaveBeenCalledWith({
          type: ScheduleType.FIXED_TIME,
          timeSlots: ['10:00'],
        });
      });

      const removeButton = screen.getByRole('button', { name: /remove/i });
      fireEvent.click(removeButton);

      await waitFor(() => {
        expect(mockOnScheduleChange).toHaveBeenCalledWith({
          type: ScheduleType.FIXED_TIME,
          timeSlots: [],
        });
      });
    });

    it('validates time slot inputs', async () => {
      const addButton = screen.getByRole('button', { name: /add time/i });
      fireEvent.click(addButton);

      const timeInput = screen.getByLabelText(/time slot/i);
      fireEvent.change(timeInput, { target: { value: 'invalid' } });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Invalid Time Format',
          status: 'error',
        })
      );
    });

    it('handles duplicate time slots', async () => {
      const addButton = screen.getByRole('button', { name: /add time/i });
      
      // Add first time slot
      fireEvent.click(addButton);
      const firstTimeInput = screen.getByLabelText(/time slot/i);
      fireEvent.change(firstTimeInput, { target: { value: '10:00' } });

      // Add second time slot with same time
      fireEvent.click(addButton);
      const secondTimeInput = screen.getAllByLabelText(/time slot/i)[1];
      fireEvent.change(secondTimeInput, { target: { value: '10:00' } });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Duplicate Time',
          status: 'warning',
        })
      );
    });
  });

  describe('Interval Schedule', () => {
    beforeEach(() => {
      render(<ScheduleBuilder onScheduleChange={mockOnScheduleChange} />);
      const select = screen.getByLabelText(/schedule type/i);
      fireEvent.change(select, { target: { value: ScheduleType.INTERVAL } });
    });

    it('handles interval schedule configuration', async () => {
      const intervalInput = screen.getByLabelText(/interval/i);
      const unitSelect = screen.getByLabelText(/unit/i);

      fireEvent.change(intervalInput, { target: { value: '4' } });
      fireEvent.change(unitSelect, { target: { value: 'hours' } });

      await waitFor(() => {
        expect(mockOnScheduleChange).toHaveBeenCalledWith({
          type: ScheduleType.INTERVAL,
          interval: 4,
          unit: 'hours',
        });
      });
    });

    it('validates interval inputs', () => {
      const intervalInput = screen.getByLabelText(/interval/i);
      fireEvent.change(intervalInput, { target: { value: '-1' } });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Invalid Interval',
          status: 'error',
        })
      );
    });

    it('handles maximum interval validation', () => {
      const intervalInput = screen.getByLabelText(/interval/i);
      const unitSelect = screen.getByLabelText(/unit/i);

      fireEvent.change(intervalInput, { target: { value: '25' } });
      fireEvent.change(unitSelect, { target: { value: 'hours' } });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Invalid Interval',
          description: expect.stringContaining('maximum'),
          status: 'error',
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('handles invalid schedule type gracefully', async () => {
      render(<ScheduleBuilder onScheduleChange={mockOnScheduleChange} />);
      const select = screen.getByLabelText(/schedule type/i);
      
      // @ts-ignore - Testing invalid type
      fireEvent.change(select, { target: { value: 'invalid' } });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Invalid Schedule Type',
          status: 'error',
        })
      );
    });

    it('handles empty required fields', () => {
      render(<ScheduleBuilder onScheduleChange={mockOnScheduleChange} />);
      const select = screen.getByLabelText(/schedule type/i);
      fireEvent.change(select, { target: { value: ScheduleType.INTERVAL } });

      const intervalInput = screen.getByLabelText(/interval/i);
      fireEvent.change(intervalInput, { target: { value: '' } });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Required Field',
          status: 'error',
        })
      );
    });
  });
});
