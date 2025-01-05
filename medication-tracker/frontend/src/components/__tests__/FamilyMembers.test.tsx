import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FamilyMembers from '../FamilyMembers';

// Mock console.log to test button clicks
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});

describe('FamilyMembers', () => {
    const mockFamilyMembers = [
        {
            id: 1,
            name: 'John Doe',
            relationship: 'Father',
            age: 65,
            medications: ['Aspirin', 'Vitamin D'],
        },
        {
            id: 2,
            name: 'Jane Doe',
            relationship: 'Mother',
            age: 60,
            medications: ['Calcium', 'Vitamin B12'],
        },
    ];

    beforeEach(() => {
        mockConsoleLog.mockClear();
    });

    it('renders the component title', () => {
        render(<FamilyMembers />);
        expect(screen.getByText('Family Members')).toBeInTheDocument();
    });

    it('renders the Add Family Member button', () => {
        render(<FamilyMembers />);
        const addButton = screen.getByText('Add Family Member');
        expect(addButton).toBeInTheDocument();
        
        userEvent.click(addButton);
        expect(mockConsoleLog).toHaveBeenCalledWith('Add family member clicked');
    });

    it('renders family member cards', () => {
        render(<FamilyMembers />);

        // Check if both family members are rendered
        mockFamilyMembers.forEach(member => {
            expect(screen.getByText(member.name)).toBeInTheDocument();
            expect(screen.getByText(member.relationship)).toBeInTheDocument();
            expect(screen.getByText(`Age: ${member.age}`)).toBeInTheDocument();
        });
    });

    it('displays medications for each family member', () => {
        render(<FamilyMembers />);

        // Check if all medications are displayed
        mockFamilyMembers.forEach(member => {
            member.medications.forEach(medication => {
                expect(screen.getByText(medication)).toBeInTheDocument();
            });
        });
    });

    it('renders edit and delete buttons for each member', () => {
        render(<FamilyMembers />);

        // We should have one edit and one delete button per family member
        const editButtons = screen.getAllByRole('button', { name: /edit/i });
        const deleteButtons = screen.getAllByRole('button', { name: /delete/i });

        expect(editButtons).toHaveLength(mockFamilyMembers.length);
        expect(deleteButtons).toHaveLength(mockFamilyMembers.length);
    });

    it('handles edit button clicks', () => {
        render(<FamilyMembers />);

        const editButtons = screen.getAllByRole('button', { name: /edit/i });
        userEvent.click(editButtons[0]);

        expect(mockConsoleLog).toHaveBeenCalledWith('Edit clicked', mockFamilyMembers[0].id);
    });

    it('handles delete button clicks', () => {
        render(<FamilyMembers />);

        const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
        userEvent.click(deleteButtons[0]);

        expect(mockConsoleLog).toHaveBeenCalledWith('Delete clicked', mockFamilyMembers[0].id);
    });

    it('generates correct avatar initials', () => {
        render(<FamilyMembers />);

        mockFamilyMembers.forEach(member => {
            const initials = member.name.split(' ').map(n => n[0]).join('');
            expect(screen.getByText(initials)).toBeInTheDocument();
        });
    });

    it('generates consistent colors for avatars', () => {
        render(<FamilyMembers />);

        // Get all avatars
        const avatars = screen.getAllByRole('img', { hidden: true });

        // Check if each avatar has a background color
        avatars.forEach((avatar) => {
            const style = window.getComputedStyle(avatar);
            expect(style.backgroundColor).not.toBe('');
        });
    });

    it('renders family member information in correct layout', () => {
        render(<FamilyMembers />);

        // Check grid layout
        const gridContainer = screen.getByRole('grid');
        expect(gridContainer).toBeInTheDocument();

        // Check card layout for first member
        const firstMember = mockFamilyMembers[0];
        const memberCard = screen.getByText(firstMember.name).closest('.MuiCard-root');
        expect(memberCard).toBeInTheDocument();

        // Check card content structure
        within(memberCard).getByText(firstMember.name);
        within(memberCard).getByText(firstMember.relationship);
        within(memberCard).getByText(`Age: ${firstMember.age}`);
        within(memberCard).getByText('Medications:');
    });

    it('renders medication chips with icons', () => {
        render(<FamilyMembers />);

        // Check if medication chips are rendered with icons
        mockFamilyMembers.forEach(member => {
            member.medications.forEach(medication => {
                const chip = screen.getByText(medication).closest('.MuiChip-root');
                expect(chip).toBeInTheDocument();
                expect(within(chip).getByTestId('MedicationIcon')).toBeInTheDocument();
            });
        });
    });
});
