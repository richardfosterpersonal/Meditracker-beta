import React from 'react';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { MedicationForm } from '../MedicationForm';
import { ThemeProvider, createTheme } from '@mui/material';

expect.extend(toHaveNoViolations);

const mockOnSubmit = jest.fn();

const renderWithTheme = (component: React.ReactElement) => {
  const theme = createTheme({
    palette: {
      mode: 'light',
    },
  });
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('MedicationForm Accessibility', () => {
  it('should have no accessibility violations', async () => {
    const { container } = renderWithTheme(
      <MedicationForm onSubmit={mockOnSubmit} mode="create" />
    );
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have proper form labeling', () => {
    renderWithTheme(<MedicationForm onSubmit={mockOnSubmit} mode="create" />);
    
    // Check for required field labels
    expect(screen.getByLabelText(/medication name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/dosage/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/frequency/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/prescribed by/i)).toBeInTheDocument();
  });

  it('should indicate required fields', () => {
    renderWithTheme(<MedicationForm onSubmit={mockOnSubmit} mode="create" />);
    
    // Check for required field indicators
    const requiredLabels = screen.getAllByText('*');
    expect(requiredLabels.length).toBeGreaterThan(0);

    // Check that required inputs have aria-required="true"
    const requiredInputs = screen.getAllByRole('textbox', { 'aria-required': 'true' });
    expect(requiredInputs.length).toBeGreaterThan(0);
  });

  it('should have accessible submit button', () => {
    renderWithTheme(<MedicationForm onSubmit={mockOnSubmit} mode="create" />);
    
    const submitButton = screen.getByRole('button', { name: /add medication/i });
    expect(submitButton).toBeInTheDocument();
    expect(submitButton).toHaveAttribute('type', 'submit');
  });
});
