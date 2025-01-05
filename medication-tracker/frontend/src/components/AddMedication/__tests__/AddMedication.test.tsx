import React from 'react';
import { render, screen, fireEvent, waitFor } from '../../../tests/testUtils';
import userEvent from '@testing-library/user-event';
import AddMedication from '../AddMedication';
import axiosInstance from '../../../services/api';

// Mock axios instance
jest.mock('../../../services/api', () => ({
    post: jest.fn()
}));

describe('AddMedication Component', () => {
    const mockHandleClose = jest.fn();
    const mockOnMedicationAdded = jest.fn();
    const defaultProps = {
        open: true,
        handleClose: mockHandleClose,
        onMedicationAdded: mockOnMedicationAdded
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders all form fields correctly', () => {
        render(<AddMedication {...defaultProps} />);

        // Check for all required form fields
        expect(screen.getByLabelText(/medication name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/dosage/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/frequency/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/reminder time/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/instructions/i)).toBeInTheDocument();
    });

    it('handles form submission successfully', async () => {
        const mockResponse = {
            status: 201,
            data: {
                id: '1',
                name: 'Test Med',
                dosage: '10mg',
                frequency: 'daily',
                time: '2024-12-09T09:00:00.000Z'
            }
        };

        (axiosInstance.post as jest.Mock).mockResolvedValueOnce(mockResponse);

        render(<AddMedication {...defaultProps} />);

        // Fill out the form
        await userEvent.type(screen.getByLabelText(/medication name/i), 'Test Med');
        await userEvent.type(screen.getByLabelText(/dosage/i), '10mg');
        await userEvent.type(screen.getByLabelText(/category/i), 'Test Category');
        await userEvent.type(screen.getByLabelText(/instructions/i), 'Test instructions');

        // Submit the form
        fireEvent.click(screen.getByText(/add medication/i));

        await waitFor(() => {
            expect(axiosInstance.post).toHaveBeenCalled();
            expect(mockOnMedicationAdded).toHaveBeenCalledWith(mockResponse.data);
            expect(mockHandleClose).toHaveBeenCalled();
        });
    });

    it('displays error message on submission failure', async () => {
        const errorMessage = 'Failed to add medication';
        (axiosInstance.post as jest.Mock).mockRejectedValueOnce({
            response: { data: { error: errorMessage } }
        });

        render(<AddMedication {...defaultProps} />);

        // Fill out minimum required fields
        await userEvent.type(screen.getByLabelText(/medication name/i), 'Test Med');
        await userEvent.type(screen.getByLabelText(/dosage/i), '10mg');

        // Submit the form
        fireEvent.click(screen.getByText(/add medication/i));

        await waitFor(() => {
            expect(screen.getByText(errorMessage)).toBeInTheDocument();
            expect(mockHandleClose).not.toHaveBeenCalled();
        });
    });

    it('validates required fields', async () => {
        render(<AddMedication {...defaultProps} />);

        // Try to submit without filling required fields
        fireEvent.click(screen.getByText(/add medication/i));

        // Check for HTML5 validation messages
        const nameInput = screen.getByLabelText(/medication name/i) as HTMLInputElement;
        const dosageInput = screen.getByLabelText(/dosage/i) as HTMLInputElement;

        expect(nameInput.validity.valid).toBeFalsy();
        expect(dosageInput.validity.valid).toBeFalsy();
    });

    it('closes dialog when cancel is clicked', () => {
        render(<AddMedication {...defaultProps} />);
        
        fireEvent.click(screen.getByText(/cancel/i));
        
        expect(mockHandleClose).toHaveBeenCalled();
    });
});
