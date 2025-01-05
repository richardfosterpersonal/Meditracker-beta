import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Profile from '../Profile';

// Mock NotificationSubscription component
jest.mock('../NotificationSubscription', () => {
    return function MockNotificationSubscription() {
        return <div data-testid="notification-subscription">Notification Subscription</div>;
    };
});

// Mock console.log for save action
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});

describe('Profile', () => {
    const initialUserData = {
        firstName: 'John',
        lastName: 'Smith',
        email: 'john.smith@example.com',
        phone: '(555) 123-4567',
        emergencyContact: {
            name: 'Jane Smith',
            relationship: 'Spouse',
            phone: '(555) 987-6543',
        },
    };

    beforeEach(() => {
        mockConsoleLog.mockClear();
    });

    it('renders profile information correctly', () => {
        render(<Profile />);

        // Check personal information
        expect(screen.getByText('Profile Settings')).toBeInTheDocument();
        expect(screen.getByText(`${initialUserData.firstName} ${initialUserData.lastName}`)).toBeInTheDocument();
        expect(screen.getByText(initialUserData.email)).toBeInTheDocument();

        // Check avatar
        const avatar = screen.getByText('JS'); // Initial letters
        expect(avatar).toBeInTheDocument();
    });

    it('displays all form fields with correct initial values', () => {
        render(<Profile />);

        // Personal Information
        expect(screen.getByLabelText('First Name')).toHaveValue(initialUserData.firstName);
        expect(screen.getByLabelText('Last Name')).toHaveValue(initialUserData.lastName);
        expect(screen.getByLabelText('Email')).toHaveValue(initialUserData.email);
        expect(screen.getByLabelText('Phone')).toHaveValue(initialUserData.phone);

        // Emergency Contact
        expect(screen.getByLabelText('Contact Name')).toHaveValue(initialUserData.emergencyContact.name);
        expect(screen.getByLabelText('Relationship')).toHaveValue(initialUserData.emergencyContact.relationship);
        expect(screen.getByLabelText('Emergency Contact Phone')).toHaveValue(initialUserData.emergencyContact.phone);
    });

    it('starts with disabled form fields', () => {
        render(<Profile />);

        // Check if all fields are initially disabled
        const inputFields = screen.getAllByRole('textbox');
        inputFields.forEach(field => {
            expect(field).toBeDisabled();
        });
    });

    it('enables form fields when edit button is clicked', () => {
        render(<Profile />);

        // Click edit button
        const editButton = screen.getByRole('button', { name: /edit/i });
        userEvent.click(editButton);

        // Check if all fields are enabled
        const inputFields = screen.getAllByRole('textbox');
        inputFields.forEach(field => {
            expect(field).toBeEnabled();
        });
    });

    it('updates personal information fields correctly', () => {
        render(<Profile />);

        // Enable editing
        const editButton = screen.getByRole('button', { name: /edit/i });
        userEvent.click(editButton);

        // Update fields
        const firstNameInput = screen.getByLabelText('First Name');
        userEvent.clear(firstNameInput);
        userEvent.type(firstNameInput, 'Jane');

        const lastNameInput = screen.getByLabelText('Last Name');
        userEvent.clear(lastNameInput);
        userEvent.type(lastNameInput, 'Doe');

        // Save changes
        const saveButton = screen.getByRole('button', { name: /save/i });
        userEvent.click(saveButton);

        // Verify console log was called with updated data
        expect(mockConsoleLog).toHaveBeenCalledWith('Saving profile data', expect.objectContaining({
            firstName: 'Jane',
            lastName: 'Doe'
        }));
    });

    it('updates emergency contact fields correctly', () => {
        render(<Profile />);

        // Enable editing
        const editButton = screen.getByRole('button', { name: /edit/i });
        userEvent.click(editButton);

        // Update emergency contact fields
        const contactNameInput = screen.getByLabelText('Contact Name');
        userEvent.clear(contactNameInput);
        userEvent.type(contactNameInput, 'John Doe');

        const relationshipInput = screen.getByLabelText('Relationship');
        userEvent.clear(relationshipInput);
        userEvent.type(relationshipInput, 'Brother');

        // Save changes
        const saveButton = screen.getByRole('button', { name: /save/i });
        userEvent.click(saveButton);

        // Verify console log was called with updated data
        expect(mockConsoleLog).toHaveBeenCalledWith('Saving profile data', expect.objectContaining({
            emergencyContact: expect.objectContaining({
                name: 'John Doe',
                relationship: 'Brother'
            })
        }));
    });

    it('renders notification subscription component', () => {
        render(<Profile />);
        expect(screen.getByTestId('notification-subscription')).toBeInTheDocument();
    });

    it('maintains form state during edit/save cycle', () => {
        render(<Profile />);

        // Enable editing
        const editButton = screen.getByRole('button', { name: /edit/i });
        userEvent.click(editButton);

        // Make changes
        const firstNameInput = screen.getByLabelText('First Name');
        userEvent.clear(firstNameInput);
        userEvent.type(firstNameInput, 'Jane');

        // Save changes
        const saveButton = screen.getByRole('button', { name: /save/i });
        userEvent.click(saveButton);

        // Verify fields are disabled but maintain new values
        expect(firstNameInput).toBeDisabled();
        expect(firstNameInput).toHaveValue('Jane');
    });

    it('displays proper layout structure', () => {
        render(<Profile />);

        // Check main sections
        expect(screen.getByText('Personal Information')).toBeInTheDocument();
        expect(screen.getByText('Emergency Contact')).toBeInTheDocument();
        expect(screen.getByText('Notification Settings')).toBeInTheDocument();

        // Check grid layout
        const gridContainer = screen.getByRole('grid');
        expect(gridContainer).toBeInTheDocument();

        // Verify sections are properly divided
        const dividers = screen.getAllByRole('separator');
        expect(dividers.length).toBeGreaterThan(0);
    });

    it('handles phone number format correctly', () => {
        render(<Profile />);

        // Enable editing
        const editButton = screen.getByRole('button', { name: /edit/i });
        userEvent.click(editButton);

        // Update phone number
        const phoneInput = screen.getByLabelText('Phone');
        userEvent.clear(phoneInput);
        userEvent.type(phoneInput, '(555) 999-8888');

        // Save changes
        const saveButton = screen.getByRole('button', { name: /save/i });
        userEvent.click(saveButton);

        // Verify phone number format is maintained
        expect(phoneInput).toHaveValue('(555) 999-8888');
    });
});
