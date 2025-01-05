import React from 'react';
import { render } from '../../__tests__/testUtils';
import EditMedication from '../EditMedication';
import { mockMedication } from '../../__tests__/testUtils';
import axiosInstance from '../../services/api';

// Mock axios instance
jest.mock('../../services/api', () => ({
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

    it('renders with pre-filled medication data', async () => {
        const { findByLabelText } = render(<EditMedication {...defaultProps} />);

        // Check if form fields are pre-filled with medication data
        const nameInput = await findByLabelText(/medication name/i);
        const dosageInput = await findByLabelText(/dosage/i);
        const categoryInput = await findByLabelText(/category/i);
        const instructionsInput = await findByLabelText(/instructions/i);

        expect(nameInput).toHaveValue(mockMedication.name);
        expect(dosageInput).toHaveValue(mockMedication.dosage);
        expect(categoryInput).toHaveValue(mockMedication.category);
        expect(instructionsInput).toHaveValue(mockMedication.notes);
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

        const { findByLabelText, findByRole, user } = render(<EditMedication {...defaultProps} />);

        // Update form fields
        const nameInput = await findByLabelText(/medication name/i);
        const dosageInput = await findByLabelText(/dosage/i);

        await user.clear(nameInput);
        await user.type(nameInput, 'Updated Med Name');
        await user.clear(dosageInput);
        await user.type(dosageInput, '20mg');

        // Submit the form
        const submitButton = await findByRole('button', { name: /update medication/i });
        await user.click(submitButton);

        // Verify API call and callbacks
        expect(axiosInstance.put).toHaveBeenCalledWith(
            `/medications/${mockMedication.id}/`,
            expect.any(Object)
        );
        expect(mockOnMedicationUpdated).toHaveBeenCalledWith(updatedMedication);
        expect(mockHandleClose).toHaveBeenCalled();
    });

    it('displays error message on submission failure', async () => {
        const errorMessage = 'Failed to update medication';
        (axiosInstance.put as jest.Mock).mockRejectedValueOnce({
            response: { data: { error: errorMessage } }
        });

        const { findByLabelText, findByRole, findByText, user } = render(<EditMedication {...defaultProps} />);

        // Make some changes
        const nameInput = await findByLabelText(/medication name/i);
        await user.clear(nameInput);
        await user.type(nameInput, 'New Name');

        // Submit the form
        const submitButton = await findByRole('button', { name: /update medication/i });
        await user.click(submitButton);

        // Verify error message
        await findByText(errorMessage);
        expect(mockHandleClose).not.toHaveBeenCalled();
    });

    it('preserves medication status during update', async () => {
        const mockResponse = {
            status: 200,
            data: mockMedication
        };

        (axiosInstance.put as jest.Mock).mockResolvedValueOnce(mockResponse);

        const { findByRole, user } = render(<EditMedication {...defaultProps} />);

        // Submit the form without changing anything
        const submitButton = await findByRole('button', { name: /update medication/i });
        await user.click(submitButton);

        expect(axiosInstance.put).toHaveBeenCalledWith(
            `/medications/${mockMedication.id}/`,
            expect.objectContaining({
                status: mockMedication.status
            })
        );
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

    it('handles dialog close', async () => {
        const { findByRole, user } = render(<EditMedication {...defaultProps} />);
        
        const cancelButton = await findByRole('button', { name: /cancel/i });
        await user.click(cancelButton);
        
        expect(mockHandleClose).toHaveBeenCalled();
    });

    it('validates required fields', async () => {
        const { findByLabelText, findByRole, user } = render(<EditMedication {...defaultProps} />);

        // Clear required fields
        const nameInput = await findByLabelText(/medication name/i);
        const dosageInput = await findByLabelText(/dosage/i);
        
        await user.clear(nameInput);
        await user.clear(dosageInput);

        // Try to submit
        const submitButton = await findByRole('button', { name: /update medication/i });
        await user.click(submitButton);

        // Check validation
        expect((nameInput as HTMLInputElement).validity.valid).toBeFalsy();
        expect((dosageInput as HTMLInputElement).validity.valid).toBeFalsy();
        expect(axiosInstance.put).not.toHaveBeenCalled();
    });
});
