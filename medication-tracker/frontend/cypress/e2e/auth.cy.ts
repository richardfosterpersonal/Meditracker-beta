import { faker } from '@faker-js/faker';

describe('Authentication Flow', () => {
  beforeEach(() => {
    // Clear cookies and local storage between tests
    cy.clearCookies();
    cy.clearLocalStorage();
  });

  describe('Registration', () => {
    const newUser = {
      email: faker.internet.email(),
      password: faker.internet.password({ length: 12 }),
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
    };

    it('should successfully register a new user', () => {
      cy.visit('/register');
      cy.get('[data-testid="register-email"]').type(newUser.email);
      cy.get('[data-testid="register-password"]').type(newUser.password);
      cy.get('[data-testid="register-confirm-password"]').type(newUser.password);
      cy.get('[data-testid="register-first-name"]').type(newUser.firstName);
      cy.get('[data-testid="register-last-name"]').type(newUser.lastName);
      cy.get('[data-testid="register-submit"]').click();

      // Should redirect to dashboard after successful registration
      cy.url().should('include', '/dashboard');
      cy.get('[data-testid="user-menu"]').should('contain', newUser.firstName);
    });

    it('should show validation errors for invalid inputs', () => {
      cy.visit('/register');
      
      // Try submitting empty form
      cy.get('[data-testid="register-submit"]').click();
      cy.get('[data-testid="register-email-error"]').should('be.visible');
      cy.get('[data-testid="register-password-error"]').should('be.visible');

      // Try weak password
      cy.get('[data-testid="register-email"]').type(newUser.email);
      cy.get('[data-testid="register-password"]').type('123');
      cy.get('[data-testid="register-confirm-password"]').type('123');
      cy.get('[data-testid="register-submit"]').click();
      cy.get('[data-testid="register-password-error"]')
        .should('be.visible')
        .and('contain', 'Password must be at least 8 characters');

      // Try mismatched passwords
      cy.get('[data-testid="register-password"]').clear().type(newUser.password);
      cy.get('[data-testid="register-confirm-password"]').clear().type(newUser.password + '1');
      cy.get('[data-testid="register-submit"]').click();
      cy.get('[data-testid="register-confirm-password-error"]')
        .should('be.visible')
        .and('contain', 'Passwords must match');
    });

    it('should prevent duplicate email registration', () => {
      // First registration
      cy.visit('/register');
      cy.get('[data-testid="register-email"]').type(newUser.email);
      cy.get('[data-testid="register-password"]').type(newUser.password);
      cy.get('[data-testid="register-confirm-password"]').type(newUser.password);
      cy.get('[data-testid="register-first-name"]').type(newUser.firstName);
      cy.get('[data-testid="register-last-name"]').type(newUser.lastName);
      cy.get('[data-testid="register-submit"]').click();

      // Logout
      cy.get('[data-testid="user-menu"]').click();
      cy.get('[data-testid="logout-button"]').click();

      // Try registering with same email
      cy.visit('/register');
      cy.get('[data-testid="register-email"]').type(newUser.email);
      cy.get('[data-testid="register-password"]').type(newUser.password);
      cy.get('[data-testid="register-confirm-password"]').type(newUser.password);
      cy.get('[data-testid="register-first-name"]').type(newUser.firstName);
      cy.get('[data-testid="register-last-name"]').type(newUser.lastName);
      cy.get('[data-testid="register-submit"]').click();

      cy.get('[data-testid="register-error"]')
        .should('be.visible')
        .and('contain', 'Email already registered');
    });
  });

  describe('Login', () => {
    const user = {
      email: faker.internet.email(),
      password: faker.internet.password({ length: 12 }),
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
    };

    beforeEach(() => {
      // Create a test user before each login test
      cy.request('POST', `${Cypress.env('apiUrl')}/auth/register`, user);
    });

    it('should successfully login with valid credentials', () => {
      cy.visit('/login');
      cy.get('[data-testid="login-email"]').type(user.email);
      cy.get('[data-testid="login-password"]').type(user.password);
      cy.get('[data-testid="login-submit"]').click();

      // Should redirect to dashboard after successful login
      cy.url().should('include', '/dashboard');
      cy.get('[data-testid="user-menu"]').should('contain', user.firstName);
    });

    it('should show error for invalid credentials', () => {
      cy.visit('/login');
      cy.get('[data-testid="login-email"]').type(user.email);
      cy.get('[data-testid="login-password"]').type('wrongpassword');
      cy.get('[data-testid="login-submit"]').click();

      cy.get('[data-testid="login-error"]')
        .should('be.visible')
        .and('contain', 'Invalid email or password');
    });

    it('should maintain session after page reload', () => {
      // Login
      cy.visit('/login');
      cy.get('[data-testid="login-email"]').type(user.email);
      cy.get('[data-testid="login-password"]').type(user.password);
      cy.get('[data-testid="login-submit"]').click();

      // Verify login successful
      cy.url().should('include', '/dashboard');
      cy.get('[data-testid="user-menu"]').should('contain', user.firstName);

      // Reload page
      cy.reload();

      // Should still be logged in
      cy.url().should('include', '/dashboard');
      cy.get('[data-testid="user-menu"]').should('contain', user.firstName);
    });
  });

  describe('Password Reset', () => {
    const user = {
      email: faker.internet.email(),
      password: faker.internet.password({ length: 12 }),
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
    };

    beforeEach(() => {
      // Create a test user before each password reset test
      cy.request('POST', `${Cypress.env('apiUrl')}/auth/register`, user);
    });

    it('should send password reset email', () => {
      cy.visit('/forgot-password');
      cy.get('[data-testid="reset-email"]').type(user.email);
      cy.get('[data-testid="reset-submit"]').click();

      cy.get('[data-testid="reset-success"]')
        .should('be.visible')
        .and('contain', 'Password reset email sent');
    });

    it('should show error for non-existent email', () => {
      cy.visit('/forgot-password');
      cy.get('[data-testid="reset-email"]').type('nonexistent@example.com');
      cy.get('[data-testid="reset-submit"]').click();

      cy.get('[data-testid="reset-error"]')
        .should('be.visible')
        .and('contain', 'Email not found');
    });

    // Note: Full password reset flow cannot be tested in E2E
    // as it requires email interaction. This should be covered
    // in integration tests with mocked email service.
  });

  describe('Logout', () => {
    const user = {
      email: faker.internet.email(),
      password: faker.internet.password({ length: 12 }),
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
    };

    beforeEach(() => {
      // Create and login test user
      cy.request('POST', `${Cypress.env('apiUrl')}/auth/register`, user);
      cy.request('POST', `${Cypress.env('apiUrl')}/auth/login`, {
        email: user.email,
        password: user.password,
      }).then((response) => {
        window.localStorage.setItem('token', response.body.token);
      });
    });

    it('should successfully logout', () => {
      cy.visit('/dashboard');
      cy.get('[data-testid="user-menu"]').click();
      cy.get('[data-testid="logout-button"]').click();

      // Should redirect to login page
      cy.url().should('include', '/login');

      // Should clear session
      cy.window().its('localStorage').invoke('getItem', 'token').should('be.null');
    });

    it('should prevent accessing protected routes after logout', () => {
      // First logout
      cy.visit('/dashboard');
      cy.get('[data-testid="user-menu"]').click();
      cy.get('[data-testid="logout-button"]').click();

      // Try accessing dashboard
      cy.visit('/dashboard');

      // Should redirect to login
      cy.url().should('include', '/login');
    });
  });
});
