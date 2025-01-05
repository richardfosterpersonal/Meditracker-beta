import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { format } from 'date-fns';
import Dashboard from '../Dashboard';
import axiosInstance from '../../services/api';

// Mock the API service
jest.mock('../../services/api', () => ({
    __esModule: true,
    default: {
        get: jest.fn()
    }
}));

// Mock date-fns for consistent date formatting
jest.mock('date-fns', () => ({
    ...jest.requireActual('date-fns'),
    format: jest.fn().mockReturnValue('12:00 PM'),
    parseISO: jest.fn(date => new Date(date)),
    isAfter: jest.fn().mockReturnValue(true),
    subDays: jest.fn(date => date)
}));

describe('Dashboard', () => {
    const mockMedications = [
        { id: 1, name: 'Med 1', dosage: '10mg', nextDose: '2024-12-10T14:00:00Z', endDate: null },
        { id: 2, name: 'Med 2', dosage: '20mg', nextDose: '2024-12-10T16:00:00Z', endDate: '2025-01-01' }
    ];

    const mockHistory = [
        { id: 1, status: 'taken', scheduledTime: '2024-12-09T14:00:00Z', medicationName: 'Med 1' },
        { id: 2, status: 'missed', scheduledTime: '2024-12-09T16:00:00Z', medicationName: 'Med 2' }
    ];

    const mockNotifications = [
        { id: 1, message: 'Time to take Med 1', timestamp: '2024-12-10T14:00:00Z' },
        { id: 2, message: 'Missed dose: Med 2', timestamp: '2024-12-09T16:00:00Z' }
    ];

    beforeEach(() => {
        jest.clearAllMocks();
        // Setup successful API responses
        (axiosInstance.get as jest.Mock).mockImplementation((url) => {
            switch (url) {
                case '/medications/':
                    return Promise.resolve({ data: mockMedications });
                case '/medication-history/':
                    return Promise.resolve({ data: mockHistory });
                case '/notifications/':
                    return Promise.resolve({ data: mockNotifications });
                default:
                    return Promise.reject(new Error('Not found'));
            }
        });
    });

    it('renders loading state initially', () => {
        render(<Dashboard />);
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('renders dashboard content after loading', async () => {
        render(<Dashboard />);

        await waitFor(() => {
            expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
        });

        // Check overview cards
        expect(screen.getByText('Total Medications')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument(); // Total medications count
        expect(screen.getByText('2 active')).toBeInTheDocument();

        // Check adherence rate
        expect(screen.getByText('50%')).toBeInTheDocument(); // 1 taken out of 2 doses

        // Check quick actions
        expect(screen.getByText('Add Medication')).toBeInTheDocument();
        expect(screen.getByText('Family Members')).toBeInTheDocument();

        // Check upcoming doses
        expect(screen.getByText('Upcoming Doses')).toBeInTheDocument();
        expect(screen.getByText('Med 1')).toBeInTheDocument();
        expect(screen.getByText('Med 2')).toBeInTheDocument();

        // Check recent activity
        expect(screen.getByText('Recent Activity')).toBeInTheDocument();
        expect(screen.getAllByText(/12:00 PM/).length).toBeGreaterThan(0);
    });

    it('handles API error gracefully', async () => {
        const errorMessage = 'Failed to fetch dashboard data';
        (axiosInstance.get as jest.Mock).mockRejectedValueOnce(new Error(errorMessage));

        render(<Dashboard />);

        await waitFor(() => {
            expect(screen.getByText(errorMessage)).toBeInTheDocument();
        });
    });

    it('updates tab value when quick action buttons are clicked', async () => {
        render(<Dashboard />);

        await waitFor(() => {
            expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
        });

        // Click Add Medication button
        const addMedButton = screen.getByText('Add Medication');
        userEvent.click(addMedButton);

        // Click Family Members button
        const familyButton = screen.getByText('Family Members');
        userEvent.click(familyButton);

        // Verify tab changes (implementation specific - may need adjustment)
        expect(screen.getByRole('tabpanel')).toBeInTheDocument();
    });

    it('displays correct adherence color based on rate', async () => {
        const mockHighAdherenceHistory = [
            { id: 1, status: 'taken', scheduledTime: '2024-12-09T14:00:00Z' },
            { id: 2, status: 'taken', scheduledTime: '2024-12-09T16:00:00Z' }
        ];

        (axiosInstance.get as jest.Mock).mockImplementation((url) => 
            url === '/medication-history/' 
                ? Promise.resolve({ data: mockHighAdherenceHistory })
                : Promise.resolve({ data: [] })
        );

        render(<Dashboard />);

        await waitFor(() => {
            const adherenceText = screen.getByText('100%');
            expect(adherenceText).toHaveStyle({ color: 'success.main' });
        });
    });

    it('shows empty state messages when no data', async () => {
        (axiosInstance.get as jest.Mock).mockImplementation(() => 
            Promise.resolve({ data: [] })
        );

        render(<Dashboard />);

        await waitFor(() => {
            expect(screen.getByText('No upcoming doses')).toBeInTheDocument();
            expect(screen.getByText("You're all caught up!")).toBeInTheDocument();
        });
    });
});
