import React from 'react';
import { screen, fireEvent, waitFor, render, RenderResult } from '@testing-library/react';
import { render as customRender } from '../testUtils';
import Dashboard from '../../components/Dashboard/Dashboard';
import * as medicationScheduleApi from '../../store/services/medicationScheduleApi';

// Mock the RTK Query hooks
jest.mock('../../store/services/medicationScheduleApi', () => ({
    ...jest.requireActual('../../store/services/medicationScheduleApi'),
    useGetSchedulesQuery: jest.fn(),
    useGetDoseLogsQuery: jest.fn(),
    useMarkDoseTakenMutation: jest.fn(),
}));

describe('Medication Schedule Integration Tests', () => {
    const mockSchedule = {
        id: '1',
        userId: 'user1',
        medicationName: 'Test Medication',
        dosage: '10mg',
        frequency: {
            type: 'daily' as const,
            times: ['09:00', '21:00'],
        },
        startDate: '2024-12-10T00:00:00.000Z',
        status: 'active' as const,
        createdAt: '2024-12-10T00:00:00.000Z',
        updatedAt: '2024-12-10T00:00:00.000Z',
    };

    const mockDoseLogs = [
        {
            id: 'log1',
            scheduleId: '1',
            status: 'taken' as const,
            scheduledTime: '2024-12-10T09:00:00.000Z',
            takenTime: '2024-12-10T09:05:00.000Z',
        },
    ];

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Setup mock implementations
        (medicationScheduleApi.useGetSchedulesQuery as jest.Mock).mockReturnValue({
            data: [mockSchedule],
            isLoading: false,
            error: null,
            refetch: jest.fn(),
        });

        (medicationScheduleApi.useGetDoseLogsQuery as jest.Mock).mockReturnValue({
            data: mockDoseLogs,
            isLoading: false,
            error: null,
            refetch: jest.fn(),
        });

        (medicationScheduleApi.useMarkDoseTakenMutation as jest.Mock).mockReturnValue([
            jest.fn().mockResolvedValue({ data: { success: true } }),
            { isLoading: false },
        ]);
    });

    it('displays medication schedules', async () => {
        const { findByTextWithMarkup } = customRender(<Dashboard />);
        
        await findByTextWithMarkup('Test Medication');
        await findByTextWithMarkup('10mg');
    });

    it('shows loading state while fetching schedules', async () => {
        (medicationScheduleApi.useGetSchedulesQuery as jest.Mock).mockReturnValue({
            data: null,
            isLoading: true,
            error: null,
            refetch: jest.fn(),
        });

        const { findByTestId } = customRender(<Dashboard />);
        await findByTestId('schedule-loading');
    });

    it('shows error state when fetching schedules fails', async () => {
        (medicationScheduleApi.useGetSchedulesQuery as jest.Mock).mockReturnValue({
            data: null,
            isLoading: false,
            error: { status: 500, data: { message: 'Server error' } },
            refetch: jest.fn(),
        });

        const { findByText } = customRender(<Dashboard />);
        await findByText(/error loading schedules/i);
    });

    it('allows marking a dose as taken', async () => {
        const markDoseTaken = jest.fn().mockResolvedValue({ data: { success: true } });
        (medicationScheduleApi.useMarkDoseTakenMutation as jest.Mock).mockReturnValue([
            markDoseTaken,
            { isLoading: false },
        ]);

        const { findByRole, user } = customRender(<Dashboard />);
        
        const markTakenButton = await findByRole('button', { name: /mark taken/i });
        await user.click(markTakenButton);

        expect(markDoseTaken).toHaveBeenCalledWith({
            scheduleId: '1',
            scheduledTime: expect.any(String),
        });
    });

    it('shows success message after marking dose as taken', async () => {
        const { findByRole, findByText, user } = customRender(<Dashboard />);
        
        const markTakenButton = await findByRole('button', { name: /mark taken/i });
        await user.click(markTakenButton);

        await findByText(/dose marked as taken/i);
    });
});
