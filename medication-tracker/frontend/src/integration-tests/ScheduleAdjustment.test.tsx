import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { ChakraProvider } from '@chakra-ui/react';
import { ConflictResolution } from '../components/ConflictResolution';
import { ScheduleAdjustmentService } from '../services/ScheduleAdjustmentService';
import '@testing-library/jest-dom';

const server = setupServer(
  rest.post('/api/schedule/check-conflicts', (req, res, ctx) => {
    return res(
      ctx.json({
        conflicts: [
          {
            medication1: 'Aspirin',
            medication2: 'Ibuprofen',
            time: '2024-12-11T08:00:00',
            type: 'time_proximity',
            suggestions: [
              {
                type: 'time_shift',
                description: 'Move Aspirin to 10:00 AM',
                reason: 'Maintains 2-hour gap between medications',
                original_time: '2024-12-11T08:00:00',
                suggested_time: '2024-12-11T10:00:00'
              }
            ]
          }
        ]
      })
    );
  }),

  rest.post('/api/schedule/adjust', (req, res, ctx) => {
    return res(
      ctx.json({
        success: true,
        adjusted_schedule: {
          medication_id: 'aspirin-123',
          new_time: '2024-12-11T10:00:00'
        }
      })
    );
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('Schedule Adjustment Integration', () => {
  const mockOnClose = jest.fn();
  const mockOnResolve = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('handles complete conflict resolution flow', async () => {
    const scheduleService = new ScheduleAdjustmentService();
    const conflicts = await scheduleService.checkConflicts({
      medication_id: 'aspirin-123',
      proposed_time: '2024-12-11T08:00:00'
    });

    render(
      <ChakraProvider>
        <ConflictResolution
          isOpen={true}
          onClose={mockOnClose}
          conflicts={conflicts}
          onResolve={mockOnResolve}
          scheduleName="Morning Schedule"
        />
      </ChakraProvider>
    );

    // Verify conflict detection
    expect(screen.getByText('Aspirin')).toBeInTheDocument();
    expect(screen.getByText('Ibuprofen')).toBeInTheDocument();

    // Select suggestion
    const suggestion = screen.getByText('Move Aspirin to 10:00 AM');
    fireEvent.click(suggestion);

    // Apply adjustment
    const applyButton = screen.getByText('Apply Adjustment');
    fireEvent.click(applyButton);

    // Verify adjustment was applied
    await waitFor(() => {
      expect(mockOnResolve).toHaveBeenCalledWith(
        'adjust',
        expect.objectContaining({
          type: 'time_shift',
          description: 'Move Aspirin to 10:00 AM'
        })
      );
    });
  });

  it('handles failed conflict check gracefully', async () => {
    server.use(
      rest.post('/api/schedule/check-conflicts', (req, res, ctx) => {
        return res(ctx.status(500));
      })
    );

    const scheduleService = new ScheduleAdjustmentService();
    
    await expect(scheduleService.checkConflicts({
      medication_id: 'aspirin-123',
      proposed_time: '2024-12-11T08:00:00'
    })).rejects.toThrow('Failed to check schedule conflicts');
  });

  it('handles failed adjustment gracefully', async () => {
    server.use(
      rest.post('/api/schedule/adjust', (req, res, ctx) => {
        return res(ctx.status(500));
      })
    );

    const scheduleService = new ScheduleAdjustmentService();
    
    await expect(scheduleService.adjustSchedule({
      medication_id: 'aspirin-123',
      new_time: '2024-12-11T10:00:00'
    })).rejects.toThrow('Failed to adjust schedule');
  });

  it('validates schedule adjustment suggestions', async () => {
    const scheduleService = new ScheduleAdjustmentService();
    const conflicts = await scheduleService.checkConflicts({
      medication_id: 'aspirin-123',
      proposed_time: '2024-12-11T08:00:00'
    });

    render(
      <ChakraProvider>
        <ConflictResolution
          isOpen={true}
          onClose={mockOnClose}
          conflicts={conflicts}
          onResolve={mockOnResolve}
          scheduleName="Morning Schedule"
        />
      </ChakraProvider>
    );

    // Verify suggestion details
    const suggestion = screen.getByText('Move Aspirin to 10:00 AM');
    expect(suggestion).toBeInTheDocument();
    expect(screen.getByText('Maintains 2-hour gap between medications')).toBeInTheDocument();

    // Verify time formatting
    expect(screen.getByText('8:00 AM')).toBeInTheDocument();
    expect(screen.getByText(/10:00 AM/)).toBeInTheDocument();
  });
});
