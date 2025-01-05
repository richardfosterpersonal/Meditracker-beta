import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material';
import { MemoryRouter } from 'react-router-dom';
import FamilyOverview from '../FamilyOverview';

const theme = createTheme();

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('FamilyOverview', () => {
  const mockFamilyMembers = [
    {
      id: '1',
      firstName: 'John',
      lastName: 'Doe',
      relationship: 'Father',
      dateOfBirth: '1980-01-01',
      allergies: [],
      medicalConditions: [],
      emergencyContact: {
        name: 'Jane Doe',
        phone: '123-456-7890',
        relationship: 'Wife',
      },
      permissions: {
        canView: true,
        canEdit: true,
        canDelete: true,
        canManageMedications: true,
      },
      createdAt: '2023-01-01',
      updatedAt: '2023-01-01',
    },
  ];

  const renderComponent = (members = mockFamilyMembers) => {
    return render(
      <MemoryRouter>
        <ThemeProvider theme={theme}>
          <FamilyOverview familyMembers={members} />
        </ThemeProvider>
      </MemoryRouter>
    );
  };

  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('renders family members correctly', () => {
    renderComponent();

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Father')).toBeInTheDocument();
  });

  it('displays correct initials in avatar', () => {
    renderComponent();
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('navigates to medications page when medication icon is clicked', () => {
    renderComponent();
    
    const medicationButton = screen.getByTitle('View Medications');
    fireEvent.click(medicationButton);

    expect(mockNavigate).toHaveBeenCalledWith('/medications?familyMember=1');
  });

  it('navigates to edit page when edit icon is clicked', () => {
    renderComponent();
    
    const editButton = screen.getByTitle('Edit Member');
    fireEvent.click(editButton);

    expect(mockNavigate).toHaveBeenCalledWith('/family/edit/1');
  });

  it('displays empty state message when no family members', () => {
    renderComponent([]);
    expect(screen.getByText('No family members added yet')).toBeInTheDocument();
  });
});
