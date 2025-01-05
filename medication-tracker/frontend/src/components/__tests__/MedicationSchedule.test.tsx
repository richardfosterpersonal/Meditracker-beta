import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { format, parseISO } from 'date-fns';
import MedicationSchedule from '../MedicationSchedule';
import axiosInstance from '../../services/api';

// Mock the API service
jest.mock('../../services/api', () => ({
    __esModule: true,
    default: {
        get: jest.fn(),
        post: jest.fn()
    }
}));

describe('MedicationSchedule', () => {
    const mockMedications = [
        {
            id: 1,
            name: 'Medication 1',
            dosage: '10mg',
            nextDose: '2024-12-10T09:00:00Z',
            frequency: 'daily'
        },
        {
            id: 2,
            name: 'Medication 2',
            dosage: '20mg',
            nextDose: '2024-12-10T14:00:00Z',
            frequency: 'daily'
        }
    ];

    beforeEach(() => {
        jest.clearAllMocks();
        // Setup successful API responses
        (axiosInstance.get as jest.Mock).mockResolvedValue({ data: mockMedications });
        (axiosInstance.post as jest.Mock).mockResolvedValue({ data: { success: true } });
    });

    it('renders loading state initially', () => {
        render(<MedicationSchedule />);
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('renders schedule after loading', async () => {
        render(<MedicationSchedule />);

        await waitFor(() => {
            expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
        });

        // Check if medications are displayed
        expect(screen.getByText('Medication 1')).toBeInTheDocument();
        expect(screen.getByText('Medication 2')).toBeInTheDocument();

        // Check if dosages are displayed
        expect(screen.getByText('10mg')).toBeInTheDocument();
        expect(screen.getByText('20mg')).toBeInTheDocument();
    });

    it('handles API error gracefully', async () => {
        const errorMessage = 'Failed to fetch medications';
        (axiosInstance.get as jest.Mock).mockRejectedValueOnce(new Error(errorMessage));

        render(<MedicationSchedule />);

        await waitFor(() => {
            expect(screen.getByText(errorMessage)).toBeInTheDocument();
        });
    });

    it('navigates between weeks', async () => {
        render(<MedicationSchedule />);

        await waitFor(() => {
            expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
        });

        // Find navigation buttons
        const prevWeekButton = screen.getByLabelText(/previous week/i);
        const nextWeekButton = screen.getByLabelText(/next week/i);

        // Navigate to previous week
        act(() => {
            userEvent.click(prevWeekButton);
        });

        // Navigate to next week
        act(() => {
            userEvent.click(nextWeekButton);
        });

        // Verify API calls were made with updated dates
        expect(axiosInstance.get).toHaveBeenCalledTimes(3);
    });

    it('opens confirmation dialog for medication actions', async () => {
        render(<MedicationSchedule />);

        await waitFor(() => {
            expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
        });

        // Find and click take medication button
        const takeButton = screen.getByLabelText(/mark medication 1 as taken/i);
        userEvent.click(takeButton);

        // Check if confirmation dialog appears
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText(/confirm action/i)).toBeInTheDocument();
    });

    it('tracks medication as taken', async () => {
        render(<MedicationSchedule />);

        await waitFor(() => {
            expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
        });

        // Take medication
        const takeButton = screen.getByLabelText(/mark medication 1 as taken/i);
        userEvent.click(takeButton);

        // Confirm action
        const confirmButton = screen.getByText(/confirm/i);
        userEvent.click(confirmButton);

        await waitFor(() => {
            expect(axiosInstance.post).toHaveBeenCalledWith(
                '/medications/1/track',
                { action: 'taken' }
            );
        });
    });

    it('tracks medication as skipped', async () => {
        render(<MedicationSchedule />);

        await waitFor(() => {
            expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
        });

        // Skip medication
        const skipButton = screen.getByLabelText(/mark medication 1 as skipped/i);
        userEvent.click(skipButton);

        // Confirm action
        const confirmButton = screen.getByText(/confirm/i);
        userEvent.click(confirmButton);

        await waitFor(() => {
            expect(axiosInstance.post).toHaveBeenCalledWith(
                '/medications/1/track',
                { action: 'skipped' }
            );
        });
    });

    it('displays empty state when no medications', async () => {
        (axiosInstance.get as jest.Mock).mockResolvedValueOnce({ data: [] });

        render(<MedicationSchedule />);

        await waitFor(() => {
            expect(screen.getByText(/no medications scheduled/i)).toBeInTheDocument();
        });
    });

    it('refreshes schedule after medication action', async () => {
        render(<MedicationSchedule />);

        await waitFor(() => {
            expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
        });

        // Take medication
        const takeButton = screen.getByLabelText(/mark medication 1 as taken/i);
        userEvent.click(takeButton);

        // Confirm action
        const confirmButton = screen.getByText(/confirm/i);
        userEvent.click(confirmButton);

        await waitFor(() => {
            // Verify schedule was refreshed
            expect(axiosInstance.get).toHaveBeenCalledTimes(2);
        });
    });

    it('handles failed medication action gracefully', async () => {
        (axiosInstance.post as jest.Mock).mockRejectedValueOnce(new Error('Failed to track medication'));

        render(<MedicationSchedule />);

        await waitFor(() => {
            expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
        });

        // Take medication
        const takeButton = screen.getByLabelText(/mark medication 1 as taken/i);
        userEvent.click(takeButton);

        // Confirm action
        const confirmButton = screen.getByText(/confirm/i);
        userEvent.click(confirmButton);

        await waitFor(() => {
            expect(screen.getByText(/failed to track medication/i)).toBeInTheDocument();
        });
    });
});
