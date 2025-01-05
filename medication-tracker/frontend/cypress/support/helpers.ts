import { faker } from '@faker-js/faker';

// Types
interface User {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  timeOfDay: string;
  instructions?: string;
  refillReminder?: boolean;
  refillThreshold?: number;
  currentSupply?: number;
}

// Helper functions
export const createTestUser = (): User => ({
  email: faker.internet.email(),
  password: faker.internet.password({ length: 12 }),
  firstName: faker.person.firstName(),
  lastName: faker.person.lastName(),
});

export const createTestMedication = (overrides: Partial<Medication> = {}): Medication => ({
  name: faker.commerce.productName(),
  dosage: `${faker.number.int({ min: 1, max: 1000 })}mg`,
  frequency: 'Daily',
  timeOfDay: '09:00',
  instructions: 'Take with food',
  refillReminder: true,
  refillThreshold: 5,
  currentSupply: 30,
  ...overrides,
});

// Authentication commands
Cypress.Commands.add('loginAsNewUser', () => {
  const user = createTestUser();
  return cy
    .request('POST', `${Cypress.env('apiUrl')}/auth/register`, user)
    .then(() => {
      return cy
        .request('POST', `${Cypress.env('apiUrl')}/auth/login`, {
          email: user.email,
          password: user.password,
        })
        .then((response) => {
          window.localStorage.setItem('token', response.body.token);
          return user;
        });
    });
});

// Medication commands
Cypress.Commands.add('createMedication', (medication: Medication) => {
  const token = window.localStorage.getItem('token');
  return cy.request({
    method: 'POST',
    url: `${Cypress.env('apiUrl')}/medications`,
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: medication,
  });
});

Cypress.Commands.add('deleteMedication', (medicationId: string) => {
  const token = window.localStorage.getItem('token');
  return cy.request({
    method: 'DELETE',
    url: `${Cypress.env('apiUrl')}/medications/${medicationId}`,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
});

// Database cleanup
Cypress.Commands.add('cleanupTestData', () => {
  const token = window.localStorage.getItem('token');
  if (token) {
    return cy.request({
      method: 'POST',
      url: `${Cypress.env('apiUrl')}/test/cleanup`,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }
});

// Type definitions
declare global {
  namespace Cypress {
    interface Chainable {
      loginAsNewUser(): Chainable<User>;
      createMedication(medication: Medication): Chainable<any>;
      deleteMedication(medicationId: string): Chainable<any>;
      cleanupTestData(): Chainable<any>;
    }
  }
}
