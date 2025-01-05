describe('User Management', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should handle user registration', () => {
    const email = `test${Date.now()}@example.com`;
    
    // Navigate to registration
    cy.findByText(/sign up/i).click();
    
    // Fill registration form
    cy.findByLabelText(/first name/i).type('Test');
    cy.findByLabelText(/last name/i).type('User');
    cy.findByLabelText(/email/i).type(email);
    cy.findByLabelText(/password/i).type('Password123!');
    cy.findByLabelText(/confirm password/i).type('Password123!');
    cy.findByLabelText(/timezone/i).select('UTC');
    
    // Submit form
    cy.findByRole('button', { name: /sign up/i }).click();
    
    // Verify success
    cy.url().should('include', '/dashboard');
    cy.findByText(/welcome/i).should('exist');
  });

  it('should handle login and logout', () => {
    // Login
    cy.login('test@example.com', 'password123');
    cy.url().should('include', '/dashboard');
    
    // Logout
    cy.findByText(/logout/i).click();
    cy.url().should('equal', Cypress.config().baseUrl + '/');
    
    // Verify protected route access
    cy.visit('/medications');
    cy.url().should('include', '/login');
  });

  it('should manage family members', () => {
    cy.login('test@example.com', 'password123');
    
    // Add family member
    cy.visit('/family');
    cy.findByText(/add member/i).click();
    cy.findByLabelText(/name/i).type('Family Member');
    cy.findByLabelText(/relationship/i).select('Child');
    cy.findByLabelText(/date of birth/i).type('2000-01-01');
    cy.findByRole('button', { name: /save/i }).click();
    
    // Verify family member added
    cy.findByText('Family Member').should('exist');
    cy.findByText('Child').should('exist');
  });

  it('should handle permission management', () => {
    cy.login('test@example.com', 'password123');
    
    // Navigate to family member
    cy.visit('/family');
    cy.findByText('Family Member').click();
    
    // Modify permissions
    cy.findByText(/manage permissions/i).click();
    cy.findByLabelText(/view medications/i).check();
    cy.findByLabelText(/modify schedule/i).uncheck();
    cy.findByRole('button', { name: /save/i }).click();
    
    // Verify permissions updated
    cy.findByText(/permissions updated/i).should('exist');
  });

  it('should handle emergency access', () => {
    cy.login('test@example.com', 'password123');
    
    // Set up emergency contact
    cy.visit('/settings');
    cy.findByText(/emergency contacts/i).click();
    cy.findByText(/add contact/i).click();
    
    cy.findByLabelText(/name/i).type('Emergency Contact');
    cy.findByLabelText(/relationship/i).select('Spouse');
    cy.findByLabelText(/phone/i).type('123-456-7890');
    cy.findByLabelText(/email/i).type('emergency@example.com');
    cy.findByLabelText(/grant emergency access/i).check();
    
    cy.findByRole('button', { name: /save/i }).click();
    
    // Verify emergency contact added
    cy.findByText('Emergency Contact').should('exist');
    cy.findByText(/emergency access granted/i).should('exist');
  });

  it('should handle password reset', () => {
    // Navigate to forgot password
    cy.visit('/login');
    cy.findByText(/forgot password/i).click();
    
    // Request reset
    cy.findByLabelText(/email/i).type('test@example.com');
    cy.findByRole('button', { name: /reset password/i }).click();
    
    // Verify reset email sent
    cy.findByText(/reset link sent/i).should('exist');
  });

  it('should enforce password requirements', () => {
    cy.visit('/signup');
    
    // Try weak password
    cy.findByLabelText(/password/i).type('weak');
    cy.findByText(/password must contain/i).should('exist');
    
    // Try password without number
    cy.findByLabelText(/password/i).clear().type('NoNumber!');
    cy.findByText(/must include a number/i).should('exist');
    
    // Try password without special character
    cy.findByLabelText(/password/i).clear().type('NoSpecial123');
    cy.findByText(/must include a special character/i).should('exist');
    
    // Try valid password
    cy.findByLabelText(/password/i).clear().type('ValidPass123!');
    cy.findByText(/password strength: strong/i).should('exist');
  });
});
