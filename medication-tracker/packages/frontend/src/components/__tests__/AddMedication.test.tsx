import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { store } from '../../store';
import AddMedication from '../AddMedication';
import { performanceMonitor } from '../../utils/performance';

// Mock performance monitoring
jest.mock('../../utils/performance', () => ({
    performanceMonitor: {
        trackMetric: jest.fn()
    }
}));

const mockOnClose = jest.fn();
const mockOnSubmit = jest.fn();

const renderComponent = () => {
    return render(
        <Provider store={store}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
                <BrowserRouter>
                    <AddMedication open={true} onClose={mockOnClose} onSubmit={mockOnSubmit} />
                </BrowserRouter>
            </LocalizationProvider>
        </Provider>
    );
};

describe('AddMedication Component', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders all form fields correctly', async () => {
        renderComponent();

        // Check for required form fields
        expect(screen.getByRole('textbox', { name: /medication name/i })).toBeInTheDocument();
        expect(screen.getByRole('textbox', { name: /dosage/i })).toBeInTheDocument();
        expect(screen.getByRole('combobox', { name: /frequency/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('handles form submission correctly', async () => {
        const user = userEvent.setup();
        renderComponent();

        // Fill out the form
        await user.type(screen.getByRole('textbox', { name: /medication name/i }), 'Test Medication');
        await user.type(screen.getByRole('textbox', { name: /dosage/i }), '10mg');
        
        // Select frequency
        const frequencySelect = screen.getByRole('combobox', { name: /frequency/i });
        await user.click(frequencySelect);
        await user.click(screen.getByRole('option', { name: /daily/i }));

        // Submit the form
        await user.click(screen.getByRole('button', { name: /save/i }));

        await waitFor(() => {
            expect(mockOnSubmit).toHaveBeenCalledWith({
                name: 'Test Medication',
                dosage: '10mg',
                frequency: 'daily',
                startDate: expect.any(Date),
                notes: ''
            });
        });
    });

    it('validates required fields', async () => {
        const user = userEvent.setup();
        renderComponent();

        // Try to submit without filling required fields
        await user.click(screen.getByRole('button', { name: /save/i }));

        // Check for validation messages
        expect(await screen.findByText(/medication name is required/i)).toBeInTheDocument();
        expect(await screen.findByText(/dosage is required/i)).toBeInTheDocument();
        expect(await screen.findByText(/frequency is required/i)).toBeInTheDocument();
    });

    it('tracks performance metrics', async () => {
        renderComponent();

        expect(performanceMonitor.trackMetric).toHaveBeenCalledWith(
            'AddMedication',
            expect.objectContaining({
                type: 'mount',
                duration: expect.any(Number)
            })
        );
    });

    it('handles cancellation', async () => {
        const user = userEvent.setup();
        renderComponent();

        await user.click(screen.getByRole('button', { name: /cancel/i }));
        expect(mockOnClose).toHaveBeenCalled();
    });
});
