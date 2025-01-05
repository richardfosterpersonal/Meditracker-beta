import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import axios from 'axios';
import toast from 'react-hot-toast';
import NotificationSettings from '../NotificationSettings';

// Mock dependencies
jest.mock('axios');
jest.mock('react-hot-toast', () => ({
    success: jest.fn(),
    error: jest.fn()
}));

const mockSettings = {
    emailNotifications: true,
    browserNotifications: true,
    notificationSound: true,
    notificationTypes: {
        upcomingDose: true,
        missedDose: true,
        refillReminder: true,
        interactionWarning: true
    },
    quietHours: {
        enabled: false,
        start: null,
        end: null
    },
    reminderAdvanceMinutes: 30,
    maxDailyReminders: 10,
    reminderFrequencyMinutes: 30,
    refillReminderDays: 7,
    timezone: 'UTC',
    emailVerified: false
};

const renderWithProvider = (component) => {
    return render(
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            {component}
        </LocalizationProvider>
    );
};

describe('NotificationSettings', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Setup default successful API responses
        (axios.get as jest.Mock).mockResolvedValue({
            data: { status: 'success', data: mockSettings }
        });
        (axios.put as jest.Mock).mockResolvedValue({
            data: { status: 'success' }
        });
        (axios.post as jest.Mock).mockResolvedValue({
            data: { status: 'success' }
        });
    });

    it('loads settings on mount', async () => {
        renderWithProvider(<NotificationSettings />);

        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith('/api/email/preferences');
        });

        // Verify settings are displayed
        expect(screen.getByText('Notification Settings')).toBeInTheDocument();
        expect(screen.getByLabelText(/email notifications/i)).toBeChecked();
        expect(screen.getByLabelText(/browser notifications/i)).toBeChecked();
        expect(screen.getByLabelText(/sound notifications/i)).toBeChecked();
    });

    it('handles settings load error', async () => {
        (axios.get as jest.Mock).mockRejectedValue(new Error('Failed to load'));
        renderWithProvider(<NotificationSettings />);

        await waitFor(() => {
            expect(screen.getByText(/failed to load notification settings/i)).toBeInTheDocument();
        });
    });

    it('saves settings successfully', async () => {
        renderWithProvider(<NotificationSettings />);

        await waitFor(() => {
            expect(screen.getByText('Save Changes')).toBeEnabled();
        });

        // Change a setting
        const emailSwitch = screen.getByLabelText(/email notifications/i);
        userEvent.click(emailSwitch);

        // Save changes
        const saveButton = screen.getByText('Save Changes');
        userEvent.click(saveButton);

        await waitFor(() => {
            expect(axios.put).toHaveBeenCalledWith('/api/email/preferences', expect.any(Object));
            expect(toast.success).toHaveBeenCalledWith('Settings saved successfully');
        });
    });

    it('handles save error', async () => {
        (axios.put as jest.Mock).mockRejectedValue(new Error('Failed to save'));
        renderWithProvider(<NotificationSettings />);

        await waitFor(() => {
            expect(screen.getByText('Save Changes')).toBeEnabled();
        });

        // Try to save
        const saveButton = screen.getByText('Save Changes');
        userEvent.click(saveButton);

        await waitFor(() => {
            expect(screen.getByText(/failed to save settings/i)).toBeInTheDocument();
            expect(toast.error).toHaveBeenCalledWith('Failed to save settings');
        });
    });

    it('sends verification email', async () => {
        renderWithProvider(<NotificationSettings />);

        await waitFor(() => {
            expect(screen.getByText(/verify email/i)).toBeEnabled();
        });

        // Click verify email button
        const verifyButton = screen.getByText(/verify email/i);
        userEvent.click(verifyButton);

        await waitFor(() => {
            expect(axios.post).toHaveBeenCalledWith('/api/email/verify');
            expect(toast.success).toHaveBeenCalledWith('Verification code sent to your email');
        });
    });

    it('verifies email with code', async () => {
        renderWithProvider(<NotificationSettings />);

        await waitFor(() => {
            expect(screen.getByLabelText(/verification code/i)).toBeInTheDocument();
        });

        // Enter verification code
        const codeInput = screen.getByLabelText(/verification code/i);
        userEvent.type(codeInput, '123456');

        // Submit code
        const submitButton = screen.getByText(/submit code/i);
        userEvent.click(submitButton);

        await waitFor(() => {
            expect(axios.post).toHaveBeenCalledWith('/api/email/verify/123456');
            expect(toast.success).toHaveBeenCalledWith('Email verified successfully');
        });
    });

    it('handles invalid verification code', async () => {
        (axios.post as jest.Mock).mockRejectedValue(new Error('Invalid code'));
        renderWithProvider(<NotificationSettings />);

        await waitFor(() => {
            expect(screen.getByLabelText(/verification code/i)).toBeInTheDocument();
        });

        // Enter verification code
        const codeInput = screen.getByLabelText(/verification code/i);
        userEvent.type(codeInput, 'invalid');

        // Submit code
        const submitButton = screen.getByText(/submit code/i);
        userEvent.click(submitButton);

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('Invalid verification code');
        });
    });

    it('sends test notification', async () => {
        renderWithProvider(<NotificationSettings />);

        await waitFor(() => {
            expect(screen.getByText(/send test notification/i)).toBeEnabled();
        });

        // Click test notification button
        const testButton = screen.getByText(/send test notification/i);
        userEvent.click(testButton);

        await waitFor(() => {
            expect(axios.post).toHaveBeenCalledWith('/api/email/test');
            expect(toast.success).toHaveBeenCalledWith('Test notification sent');
        });
    });

    it('updates notification type settings', async () => {
        renderWithProvider(<NotificationSettings />);

        await waitFor(() => {
            expect(screen.getByLabelText(/upcoming dose notifications/i)).toBeInTheDocument();
        });

        // Toggle notification types
        const upcomingDoseSwitch = screen.getByLabelText(/upcoming dose notifications/i);
        const missedDoseSwitch = screen.getByLabelText(/missed dose notifications/i);

        userEvent.click(upcomingDoseSwitch);
        userEvent.click(missedDoseSwitch);

        // Save changes
        const saveButton = screen.getByText('Save Changes');
        userEvent.click(saveButton);

        await waitFor(() => {
            expect(axios.put).toHaveBeenCalledWith('/api/email/preferences', expect.objectContaining({
                notificationTypes: expect.objectContaining({
                    upcomingDose: false,
                    missedDose: false
                })
            }));
        });
    });

    it('updates reminder settings', async () => {
        renderWithProvider(<NotificationSettings />);

        await waitFor(() => {
            expect(screen.getByLabelText(/reminder advance time/i)).toBeInTheDocument();
        });

        // Update reminder settings
        const advanceTimeInput = screen.getByLabelText(/reminder advance time/i);
        userEvent.clear(advanceTimeInput);
        userEvent.type(advanceTimeInput, '45');

        // Save changes
        const saveButton = screen.getByText('Save Changes');
        userEvent.click(saveButton);

        await waitFor(() => {
            expect(axios.put).toHaveBeenCalledWith('/api/email/preferences', expect.objectContaining({
                reminderAdvanceMinutes: 45
            }));
        });
    });
});
