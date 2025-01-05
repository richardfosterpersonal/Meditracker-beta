import '@testing-library/cypress/add-commands';

declare global {
  namespace Cypress {
    interface Chainable {
      login(email: string, password: string): Chainable<void>;
      addMedication(name: string, dosage: string): Chainable<void>;
      addEmergencyContact(name: string, phone: string): Chainable<void>;
      clearMedications(): Chainable<void>;
      simulateOffline(): Chainable<void>;
      simulateOnline(): Chainable<void>;
      interceptNetwork(options: { route: string; status: number; response: any }): Chainable<void>;
    }
  }
}

// Login command
Cypress.Commands.add('login', (email: string, password: string) => {
  cy.visit('/login');
  cy.findByLabelText(/email/i).type(email);
  cy.findByLabelText(/password/i).type(password);
  cy.findByRole('button', { name: /sign in/i }).click();
  cy.url().should('include', '/dashboard');
});

// Add medication command
Cypress.Commands.add('addMedication', (name: string, dosage: string) => {
  cy.visit('/medications/add');
  cy.findByLabelText(/medication name/i).type(name);
  cy.findByLabelText(/dosage/i).type(dosage);
  cy.findByRole('button', { name: /save/i }).click();
  cy.findByText(name).should('exist');
});

// Add emergency contact command
Cypress.Commands.add('addEmergencyContact', (name: string, phone: string) => {
  cy.findByText(/add contact/i).click();
  cy.findByLabelText(/name/i).type(name);
  cy.findByLabelText(/phone/i).type(phone);
  cy.findByRole('button', { name: /save/i }).click();
  cy.findByText(name).should('exist');
});

// Clear medications command
Cypress.Commands.add('clearMedications', () => {
  cy.request('POST', '/api/test/clear-medications');
});

// Network simulation commands
Cypress.Commands.add('simulateOffline', () => {
  cy.window().then((win) => {
    cy.stub(win.navigator, 'onLine').value(false);
    win.dispatchEvent(new Event('offline'));
  });
});

Cypress.Commands.add('simulateOnline', () => {
  cy.window().then((win) => {
    cy.stub(win.navigator, 'onLine').value(true);
    win.dispatchEvent(new Event('online'));
  });
});

// Network interception helper
Cypress.Commands.add('interceptNetwork', ({ route, status, response }) => {
  cy.intercept(route, {
    statusCode: status,
    body: response
  }).as('networkRequest');
});
