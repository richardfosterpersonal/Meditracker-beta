import { faker } from '@faker-js/faker';

describe('Medication Management Flow', () => {
  const user = {
    email: faker.internet.email(),
    password: faker.internet.password({ length: 12 }),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
  };

  const medication = {
    name: 'Aspirin',
    dosage: '81mg',
    frequency: 'Daily',
    timeOfDay: '09:00',
    instructions: 'Take with food',
    refillReminder: true,
    refillThreshold: 5,
  };

  beforeEach(() => {
    // Create and login test user before each test
    cy.request('POST', `${Cypress.env('apiUrl')}/auth/register`, user);
    cy.request('POST', `${Cypress.env('apiUrl')}/auth/login`, {
      email: user.email,
      password: user.password,
    }).then((response) => {
      window.localStorage.setItem('token', response.body.token);
    });
    cy.visit('/dashboard');
  });

  describe('Add Medication', () => {
    it('should successfully add a new medication', () => {
      cy.get('[data-testid="add-medication-button"]').click();
      
      // Fill medication form
      cy.get('[data-testid="medication-name"]').type(medication.name);
      cy.get('[data-testid="medication-dosage"]').type(medication.dosage);
      cy.get('[data-testid="medication-frequency"]').click();
      cy.get('[data-value="Daily"]').click();
      cy.get('[data-testid="medication-time"]').type(medication.timeOfDay);
      cy.get('[data-testid="medication-instructions"]').type(medication.instructions);
      cy.get('[data-testid="medication-refill-reminder"]').click();
      cy.get('[data-testid="medication-refill-threshold"]').type(medication.refillThreshold.toString());
      
      cy.get('[data-testid="save-medication"]').click();

      // Verify medication appears in list
      cy.get('[data-testid="medication-list"]')
        .should('contain', medication.name)
        .and('contain', medication.dosage);
    });

    it('should validate required fields', () => {
      cy.get('[data-testid="add-medication-button"]').click();
      cy.get('[data-testid="save-medication"]').click();

      // Check validation messages
      cy.get('[data-testid="medication-name-error"]').should('be.visible');
      cy.get('[data-testid="medication-dosage-error"]').should('be.visible');
      cy.get('[data-testid="medication-frequency-error"]').should('be.visible');
      cy.get('[data-testid="medication-time-error"]').should('be.visible');
    });
  });

  describe('Edit Medication', () => {
    beforeEach(() => {
      // Add a medication before each edit test
      cy.request('POST', `${Cypress.env('apiUrl')}/medications`, {
        ...medication,
        userId: user.id,
      });
    });

    it('should successfully edit medication details', () => {
      const updatedDosage = '162mg';
      
      cy.get(`[data-testid="medication-${medication.name}"]`)
        .find('[data-testid="edit-button"]')
        .click();

      cy.get('[data-testid="medication-dosage"]')
        .clear()
        .type(updatedDosage);

      cy.get('[data-testid="save-medication"]').click();

      // Verify updated information
      cy.get('[data-testid="medication-list"]')
        .should('contain', medication.name)
        .and('contain', updatedDosage);
    });
  });

  describe('Delete Medication', () => {
    beforeEach(() => {
      // Add a medication before each delete test
      cy.request('POST', `${Cypress.env('apiUrl')}/medications`, {
        ...medication,
        userId: user.id,
      });
    });

    it('should successfully delete medication', () => {
      cy.get(`[data-testid="medication-${medication.name}"]`)
        .find('[data-testid="delete-button"]')
        .click();

      // Confirm deletion
      cy.get('[data-testid="confirm-delete"]').click();

      // Verify medication is removed
      cy.get('[data-testid="medication-list"]')
        .should('not.contain', medication.name);
    });

    it('should cancel deletion when requested', () => {
      cy.get(`[data-testid="medication-${medication.name}"]`)
        .find('[data-testid="delete-button"]')
        .click();

      // Cancel deletion
      cy.get('[data-testid="cancel-delete"]').click();

      // Verify medication still exists
      cy.get('[data-testid="medication-list"]')
        .should('contain', medication.name);
    });
  });

  describe('Medication Schedule', () => {
    beforeEach(() => {
      // Add a medication before each schedule test
      cy.request('POST', `${Cypress.env('apiUrl')}/medications`, {
        ...medication,
        userId: user.id,
      });
    });

    it('should mark medication as taken', () => {
      cy.get(`[data-testid="medication-${medication.name}"]`)
        .find('[data-testid="take-button"]')
        .click();

      // Verify taken status
      cy.get(`[data-testid="medication-${medication.name}"]`)
        .should('have.class', 'taken');

      // Check history
      cy.get('[data-testid="medication-history"]').click();
      cy.get('[data-testid="history-list"]')
        .should('contain', medication.name)
        .and('contain', 'Taken');
    });

    it('should mark medication as skipped', () => {
      cy.get(`[data-testid="medication-${medication.name}"]`)
        .find('[data-testid="skip-button"]')
        .click();

      // Add skip reason
      cy.get('[data-testid="skip-reason"]').type('Feeling unwell');
      cy.get('[data-testid="confirm-skip"]').click();

      // Verify skipped status
      cy.get(`[data-testid="medication-${medication.name}"]`)
        .should('have.class', 'skipped');

      // Check history
      cy.get('[data-testid="medication-history"]').click();
      cy.get('[data-testid="history-list"]')
        .should('contain', medication.name)
        .and('contain', 'Skipped')
        .and('contain', 'Feeling unwell');
    });
  });

  describe('Refill Management', () => {
    beforeEach(() => {
      // Add a medication with low supply
      cy.request('POST', `${Cypress.env('apiUrl')}/medications`, {
        ...medication,
        userId: user.id,
        currentSupply: 3,
      });
    });

    it('should show refill reminder when supply is low', () => {
      cy.get('[data-testid="refill-alerts"]')
        .should('contain', medication.name)
        .and('contain', 'Refill needed soon');
    });

    it('should update supply after refill', () => {
      cy.get(`[data-testid="medication-${medication.name}"]`)
        .find('[data-testid="refill-button"]')
        .click();

      cy.get('[data-testid="refill-quantity"]').type('30');
      cy.get('[data-testid="confirm-refill"]').click();

      // Verify updated supply
      cy.get(`[data-testid="medication-${medication.name}"]`)
        .find('[data-testid="current-supply"]')
        .should('contain', '33');

      // Verify refill alert is cleared
      cy.get('[data-testid="refill-alerts"]')
        .should('not.contain', medication.name);
    });
  });
});
