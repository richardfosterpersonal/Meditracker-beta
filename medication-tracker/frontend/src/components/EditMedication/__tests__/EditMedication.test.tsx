import React from 'react';
import { render, screen, fireEvent, waitFor } from '../../../tests/testUtils';
import userEvent from '@testing-library/user-event';
import EditMedication from '../EditMedication';
import { mockMedication } from '../../../tests/testUtils';
import axiosInstance from '../../../services/api';

// Mock axios instance
jest.mock('../../../services/api', () => ({
    put: jest.fn()
}));

describe('EditMedication Component', () => {
    const mockHandleClose = jest.fn();
    const mockOnMedicationUpdated = jest.fn();
    const defaultProps = {
        open: true,
        handleClose: mockHandleClose,
        onMedicationUpdated: mockOnMedicationUpdated,
        medication: mockMedication
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders with pre-filled medication data', () => {
        render(<EditMedication {...defaultProps} />);

        // Check if form fields are pre-filled with medication data
        expect(screen.getByLabelText(/medication name/i)).toHaveValue(mockMedication.name);
        expect(screen.getByLabelText(/dosage/i)).toHaveValue(mockMedication.dosage);
        expect(screen.getByLabelText(/category/i)).toHaveValue(mockMedication.category);
        expect(screen.getByLabelText(/instructions/i)).toHaveValue(mockMedication.notes);
    });

    it('handles form submission successfully', async () => {
        const updatedMedication = {
            ...mockMedication,
            name: 'Updated Med Name',
            dosage: '20mg'
        };

        const mockResponse = {
            status: 200,
            data: updatedMedication
        };

        (axiosInstance.put as jest.Mock).mockResolvedValueOnce(mockResponse);

        render(<EditMedication {...defaultProps} />);

        // Update form fields
        await userEvent.clear(screen.getByLabelText(/medication name/i));
        await userEvent.type(screen.getByLabelText(/medication name/i), 'Updated Med Name');
        await userEvent.clear(screen.getByLabelText(/dosage/i));
        await userEvent.type(screen.getByLabelText(/dosage/i), '20mg');

        // Submit the form
        fireEvent.click(screen.getByText(/update medication/i));

        await waitFor(() => {
            expect(axiosInstance.put).toHaveBeenCalledWith(
                `/medications/${mockMedication.id}/`,
                expect.any(Object)
            );
            expect(mockOnMedicationUpdated).toHaveBeenCalledWith(updatedMedication);
            expect(mockHandleClose).toHaveBeenCalled();
        });
    });

    it('displays error message on submission failure', async () => {
        const errorMessage = 'Failed to update medication';
        (axiosInstance.put as jest.Mock).mockRejectedValueOnce({
            response: { data: { error: errorMessage } }
        });

        render(<EditMedication {...defaultProps} />);

        // Make some changes
        await userEvent.clear(screen.getByLabelText(/medication name/i));
        await userEvent.type(screen.getByLabelText(/medication name/i), 'New Name');

        // Submit the form
        fireEvent.click(screen.getByText(/update medication/i));

        await waitFor(() => {
            expect(screen.getByText(errorMessage)).toBeInTheDocument();
            expect(mockHandleClose).not.toHaveBeenCalled();
        });
    });

    it('preserves medication status during update', async () => {
        const mockResponse = {
            status: 200,
            data: mockMedication
        };

        (axiosInstance.put as jest.Mock).mockResolvedValueOnce(mockResponse);

        render(<EditMedication {...defaultProps} />);

        // Submit the form without changing anything
        fireEvent.click(screen.getByText(/update medication/i));

        await waitFor(() => {
            expect(axiosInstance.put).toHaveBeenCalledWith(
                `/medications/${mockMedication.id}/`,
                expect.objectContaining({
                    status: mockMedication.status
                })
            );
        });
    });

    it('returns null if no medication prop is provided', () => {
        const { container } = render(
            <EditMedication
                {...defaultProps}
                medication={undefined}
            />
        );
        
        expect(container.firstChild).toBeNull();
    });

    it('closes dialog when cancel is clicked', () => {
        render(<EditMedication {...defaultProps} />);
        
        fireEvent.click(screen.getByText(/cancel/i));
        
        expect(mockHandleClose).toHaveBeenCalled();
    });
});
