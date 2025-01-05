import 'cypress-axe';

describe('Family Management Accessibility', () => {
  beforeEach(() => {
    cy.login('test@example.com', 'password');
    cy.visit('/family');
    cy.injectAxe();
  });

  it('should have no accessibility violations in the dashboard', () => {
    cy.checkA11y('[data-testid="family-dashboard"]', {
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa'],
      },
    });
  });

  it('should have accessible invite dialog', () => {
    cy.get('[data-testid="add-family-button"]').click();
    cy.checkA11y('[data-testid="invite-dialog"]', {
      rules: {
        'color-contrast': { enabled: true },
        'label': { enabled: true },
        'aria-required-children': { enabled: true },
      },
    });
  });

  it('should maintain focus management in dialogs', () => {
    // Open invite dialog
    cy.get('[data-testid="add-family-button"]').click();
    
    // Check if focus is trapped in dialog
    cy.focused().should('have.attr', 'name', 'name');
    cy.realPress('Tab');
    cy.focused().should('have.attr', 'name', 'email');
    cy.realPress('Tab');
    cy.focused().should('have.attr', 'name', 'relationship');
  });

  it('should have proper ARIA labels and roles', () => {
    // Check main regions
    cy.get('[role="main"]').should('exist');
    cy.get('[role="navigation"]').should('exist');

    // Check list structure
    cy.get('[role="list"]').should('exist');
    cy.get('[role="listitem"]').should('exist');

    // Check buttons
    cy.get('button').each(($button) => {
      cy.wrap($button).should('have.attr', 'aria-label');
    });
  });

  it('should handle keyboard navigation', () => {
    // Test main navigation
    cy.get('[data-testid="family-dashboard"]').should('be.visible');
    cy.realPress('Tab');
    cy.focused().should('have.attr', 'data-testid', 'add-family-button');

    // Test member list navigation
    cy.get('[data-testid="family-member-list"]').within(() => {
      cy.realPress('Tab');
      cy.focused().should('have.attr', 'data-testid', 'member-menu-button');
    });
  });

  it('should have accessible error messages', () => {
    // Mock API error
    cy.intercept('POST', '/api/family/invite', {
      statusCode: 400,
      body: { message: 'Email already exists' }
    });

    cy.get('[data-testid="add-family-button"]').click();
    
    // Submit form with existing email
    cy.get('[data-testid="invite-dialog"]').within(() => {
      cy.get('input[name="email"]').type('existing@example.com');
      cy.get('[data-testid="send-invite-button"]').click();
    });

    // Check error message accessibility
    cy.get('[role="alert"]').should('exist');
    cy.get('[aria-live="polite"]').should('contain', 'Email already exists');
  });

  it('should have accessible loading states', () => {
    // Mock slow API response
    cy.intercept('GET', '/api/family/members', (req) => {
      req.on('response', (res) => {
        res.setDelay(1000);
      });
    });

    cy.reload();

    // Check loading indicator accessibility
    cy.get('[role="progressbar"]').should('exist');
    cy.get('[aria-busy="true"]').should('exist');
  });

  it('should have accessible confirmation dialogs', () => {
    // Open remove member dialog
    cy.get('[data-testid="member-menu-button"]').first().click();
    cy.get('[data-testid="remove-member"]').click();

    // Check dialog accessibility
    cy.checkA11y('[data-testid="confirm-dialog"]', {
      rules: {
        'dialog': { enabled: true },
        'focus-trap': { enabled: true },
      },
    });

    // Check dialog structure
    cy.get('[role="dialog"]').should('exist');
    cy.get('[aria-labelledby]').should('exist');
  });
});
