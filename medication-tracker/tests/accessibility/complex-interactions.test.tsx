import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { FamilyDashboard } from '../../src/components/Family/FamilyDashboard';
import { Provider } from 'react-redux';
import { store } from '../../src/store';

expect.extend(toHaveNoViolations);

describe('Complex Family Management Interactions Accessibility', () => {
  beforeEach(() => {
    render(
      <Provider store={store}>
        <FamilyDashboard />
      </Provider>
    );
  });

  it('should maintain accessibility during drag and drop operations', async () => {
    const dragItem = screen.getByTestId('family-member-card-1');
    const dropZone = screen.getByTestId('permission-zone-admin');

    // Check initial state
    const initialResults = await axe(document.body);
    expect(initialResults).toHaveNoViolations();

    // Simulate drag operation
    fireEvent.dragStart(dragItem);
    fireEvent.dragOver(dropZone);

    // Check during drag
    const duringDragResults = await axe(document.body);
    expect(duringDragResults).toHaveNoViolations();

    // Complete drag operation
    fireEvent.drop(dropZone);
    fireEvent.dragEnd(dragItem);

    // Check final state
    const finalResults = await axe(document.body);
    expect(finalResults).toHaveNoViolations();
  });

  it('should maintain focus during multi-step operations', async () => {
    // Start multi-step operation
    const addButton = screen.getByRole('button', { name: /add family member/i });
    userEvent.click(addButton);

    // Check focus is in dialog
    expect(screen.getByRole('dialog')).toHaveFocus();

    // Fill form
    const nameInput = screen.getByLabelText(/name/i);
    const emailInput = screen.getByLabelText(/email/i);
    
    await userEvent.type(nameInput, 'John Doe');
    expect(nameInput).toHaveFocus();
    
    await userEvent.tab();
    expect(emailInput).toHaveFocus();
    
    await userEvent.type(emailInput, 'john@example.com');
    
    // Submit form
    const submitButton = screen.getByRole('button', { name: /send invitation/i });
    await userEvent.click(submitButton);

    // Check focus returns to main content
    await waitFor(() => {
      expect(screen.getByRole('main')).toHaveFocus();
    });
  });

  it('should handle keyboard navigation in complex menus', async () => {
    const menuButton = screen.getByRole('button', { name: /member actions/i });
    
    // Open menu with keyboard
    await userEvent.tab();
    expect(menuButton).toHaveFocus();
    await userEvent.keyboard('{Enter}');

    // Navigate menu items
    const menuItems = screen.getAllByRole('menuitem');
    expect(menuItems[0]).toHaveFocus();

    // Test arrow key navigation
    await userEvent.keyboard('{ArrowDown}');
    expect(menuItems[1]).toHaveFocus();

    // Test submenu navigation
    await userEvent.keyboard('{ArrowRight}');
    const submenuItems = screen.getAllByRole('menuitem', { hidden: true });
    expect(submenuItems[0]).toHaveFocus();

    // Close menu with Escape
    await userEvent.keyboard('{Escape}');
    expect(menuButton).toHaveFocus();
  });

  it('should handle error messages with screen readers', async () => {
    // Trigger an error
    const inviteButton = screen.getByRole('button', { name: /add family member/i });
    await userEvent.click(inviteButton);

    const emailInput = screen.getByLabelText(/email/i);
    await userEvent.type(emailInput, 'invalid-email');

    const submitButton = screen.getByRole('button', { name: /send invitation/i });
    await userEvent.click(submitButton);

    // Check error message accessibility
    const errorMessage = await screen.findByRole('alert');
    expect(errorMessage).toHaveAttribute('aria-live', 'assertive');
    expect(errorMessage).toBeVisible();

    // Check error message is associated with input
    expect(emailInput).toHaveAttribute('aria-invalid', 'true');
    expect(emailInput).toHaveAttribute('aria-errormessage');
  });

  it('should handle live regions for dynamic updates', async () => {
    // Mock a new family member addition
    const addButton = screen.getByRole('button', { name: /add family member/i });
    await userEvent.click(addButton);

    // Fill and submit form
    await userEvent.type(screen.getByLabelText(/name/i), 'Jane Doe');
    await userEvent.type(screen.getByLabelText(/email/i), 'jane@example.com');
    await userEvent.click(screen.getByRole('button', { name: /send invitation/i }));

    // Check live region update
    const liveRegion = screen.getByRole('status');
    expect(liveRegion).toHaveAttribute('aria-live', 'polite');
    expect(liveRegion).toHaveTextContent(/invitation sent/i);
  });

  it('should maintain accessibility during loading states', async () => {
    // Trigger loading state
    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    await userEvent.click(refreshButton);

    // Check loading indicator accessibility
    const loadingSpinner = screen.getByRole('progressbar');
    expect(loadingSpinner).toHaveAttribute('aria-busy', 'true');
    expect(loadingSpinner).toHaveAttribute('aria-label');

    // Wait for content to load
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    // Check final state accessibility
    const results = await axe(document.body);
    expect(results).toHaveNoViolations();
  });
});
