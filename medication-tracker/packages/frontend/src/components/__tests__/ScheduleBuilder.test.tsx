import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ScheduleBuilder, ScheduleType } from '../ScheduleBuilder';
import { validateSchedule } from '../../utils/scheduleValidation';
import { render, mockToast } from '../../test-utils';
import '@testing-library/jest-dom';

// Mock the ConflictResolution component
jest.mock('../ConflictResolution', () => ({
  ConflictResolution: ({ isOpen, onClose, conflicts }: any) => (
    <div data-testid="conflict-modal" data-open={isOpen}>
      {conflicts.map((c: any, i: number) => (
        <div key={i} data-testid="conflict-item">{c.message}</div>
      ))}
    </div>
  ),
}));

jest.mock('../../utils/scheduleValidation');

describe('ScheduleBuilder', () => {
  const mockOnScheduleChange = jest.fn();
  const mockValidateSchedule = validateSchedule as jest.MockedFunction<typeof validateSchedule>;

  beforeEach(() => {
    mockOnScheduleChange.mockClear();
    mockValidateSchedule.mockClear();
    mockValidateSchedule.mockImplementation(() => ({ isValid: true }));
    mockToast.mockClear();
  });

  it('renders schedule type selector with all options', () => {
    render(<ScheduleBuilder onScheduleChange={mockOnScheduleChange} medicationName="Test Med" />);
    const select = screen.getByLabelText(/schedule type/i);
    
    Object.values(ScheduleType).forEach(type => {
      expect(select).toHaveTextContent(type);
    });
  });

  describe('Fixed Time Schedule', () => {
    beforeEach(() => {
      render(<ScheduleBuilder onScheduleChange={mockOnScheduleChange} medicationName="Test Med" />);
      const select = screen.getByLabelText(/schedule type/i);
      fireEvent.change(select, { target: { value: ScheduleType.FIXED_TIME } });
    });

    it('validates time slot format', async () => {
      const addButton = screen.getByText(/add time slot/i);
      fireEvent.click(addButton);
      
      const timeInput = screen.getByRole('textbox', { name: '' });
      const doseInput = screen.getByRole('spinbutton');
      
      fireEvent.change(timeInput, { target: { value: 'invalid' } });
      expect(screen.getByText(/invalid time format/i)).toBeInTheDocument();
      
      fireEvent.change(timeInput, { target: { value: '09:00' } });
      fireEvent.change(doseInput, { target: { value: '2' } });
      
      await waitFor(() => {
        expect(mockValidateSchedule).toHaveBeenCalledWith({
          type: ScheduleType.FIXED_TIME,
          fixedTimeSlots: [{ time: '09:00', dose: 2 }]
        });
      });
    });

    it('prevents duplicate time slots', () => {
      const addButton = screen.getByText(/add time slot/i);
      fireEvent.click(addButton);
      fireEvent.click(addButton);
      
      const timeInputs = screen.getAllByRole('textbox');
      
      fireEvent.change(timeInputs[0], { target: { value: '09:00' } });
      fireEvent.change(timeInputs[1], { target: { value: '09:00' } });
      
      expect(screen.getByText(/duplicate time slots/i)).toBeInTheDocument();
    });
  });

  describe('Interval Schedule', () => {
    beforeEach(() => {
      render(<ScheduleBuilder onScheduleChange={mockOnScheduleChange} medicationName="Test Med" />);
      const select = screen.getByLabelText(/schedule type/i);
      fireEvent.change(select, { target: { value: ScheduleType.INTERVAL } });
    });

    it('validates interval hours', async () => {
      const hoursInput = screen.getByLabelText(/hours between doses/i);
      const doseInput = screen.getByLabelText(/dose amount/i);

      fireEvent.change(hoursInput, { target: { value: '0' } });
      expect(screen.getByText(/interval must be positive/i)).toBeInTheDocument();

      fireEvent.change(hoursInput, { target: { value: '6' } });
      fireEvent.change(doseInput, { target: { value: '1' } });

      await waitFor(() => {
        expect(mockValidateSchedule).toHaveBeenCalledWith({
          type: ScheduleType.INTERVAL,
          interval: { hours: 6, dose: 1 }
        });
      });
    });

    it('enforces maximum daily doses', () => {
      const hoursInput = screen.getByLabelText(/hours between doses/i);
      
      fireEvent.change(hoursInput, { target: { value: '1' } });
      
      expect(screen.getByText(/exceeds maximum daily doses/i)).toBeInTheDocument();
    });
  });

  describe('PRN Schedule', () => {
    beforeEach(() => {
      render(<ScheduleBuilder onScheduleChange={mockOnScheduleChange} medicationName="Test Med" />);
      const select = screen.getByLabelText(/schedule type/i);
      fireEvent.change(select, { target: { value: ScheduleType.PRN } });
    });

    it('validates maximum daily doses', async () => {
      const maxDailyInput = screen.getByLabelText(/maximum daily doses/i);
      const minHoursInput = screen.getByLabelText(/minimum hours between doses/i);
      const doseInput = screen.getByLabelText(/dose amount/i);

      fireEvent.change(maxDailyInput, { target: { value: '25' } });
      expect(screen.getByText(/exceeds safe daily limit/i)).toBeInTheDocument();

      fireEvent.change(maxDailyInput, { target: { value: '4' } });
      fireEvent.change(minHoursInput, { target: { value: '4' } });
      fireEvent.change(doseInput, { target: { value: '1' } });

      await waitFor(() => {
        expect(mockValidateSchedule).toHaveBeenCalledWith({
          type: ScheduleType.PRN,
          prn: { maxDailyDose: 4, minHoursBetween: 4, dose: 1 }
        });
      });
    });

    it('enforces minimum hours between doses', () => {
      const maxDailyInput = screen.getByLabelText(/maximum daily doses/i);
      const minHoursInput = screen.getByLabelText(/minimum hours between doses/i);
      
      fireEvent.change(maxDailyInput, { target: { value: '12' } });
      fireEvent.change(minHoursInput, { target: { value: '1' } });
      
      expect(screen.getByText(/minimum hours too short/i)).toBeInTheDocument();
    });
  });

  describe('Complex Schedule', () => {
    beforeEach(() => {
      render(<ScheduleBuilder onScheduleChange={mockOnScheduleChange} medicationName="Test Med" />);
      const select = screen.getByLabelText(/schedule type/i);
      fireEvent.change(select, { target: { value: ScheduleType.COMPLEX } });
    });

    it('validates dose progression', async () => {
      const addButton = screen.getByText(/add dose/i);
      fireEvent.click(addButton);
      fireEvent.click(addButton);
      
      const timeInputs = screen.getAllByRole('textbox');
      const doseInputs = screen.getAllByRole('spinbutton');
      
      fireEvent.change(timeInputs[0], { target: { value: '09:00' } });
      fireEvent.change(doseInputs[0], { target: { value: '2' } });
      fireEvent.change(timeInputs[1], { target: { value: '15:00' } });
      fireEvent.change(doseInputs[1], { target: { value: '1' } });

      await waitFor(() => {
        expect(mockValidateSchedule).toHaveBeenCalledWith({
          type: ScheduleType.COMPLEX,
          doses: [
            { time: '09:00', dose: 2 },
            { time: '15:00', dose: 1 }
          ]
        });
      });
    });

    it('validates total daily dose', () => {
      const addButton = screen.getByText(/add dose/i);
      fireEvent.click(addButton);
      fireEvent.click(addButton);
      
      const timeInputs = screen.getAllByRole('textbox');
      const doseInputs = screen.getAllByRole('spinbutton');
      
      fireEvent.change(timeInputs[0], { target: { value: '09:00' } });
      fireEvent.change(doseInputs[0], { target: { value: '10' } });
      fireEvent.change(timeInputs[1], { target: { value: '15:00' } });
      fireEvent.change(doseInputs[1], { target: { value: '10' } });
      
      expect(screen.getByText(/exceeds maximum daily dose/i)).toBeInTheDocument();
    });
  });
});
