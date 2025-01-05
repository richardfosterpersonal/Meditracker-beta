import { faker } from '@faker-js/faker';
import { createTestUser, createTestMedication } from '../support/helpers';

describe('Family Sharing Flow', () => {
  let primaryUser;
  let familyMember;
  let medication;

  beforeEach(() => {
    // Create and login as primary user
    cy.loginAsNewUser().then((user) => {
      primaryUser = user;
    });

    // Create family member account (but don't login)
    familyMember = createTestUser();
    cy.request('POST', `${Cypress.env('apiUrl')}/auth/register`, familyMember);

    // Create a medication for primary user
    medication = createTestMedication();
    cy.createMedication(medication);

    cy.visit('/dashboard');
  });

  describe('Invitation Management', () => {
    it('should successfully send family member invitation', () => {
      cy.get('[data-testid="family-sharing-button"]').click();
      cy.get('[data-testid="invite-member-button"]').click();
      cy.get('[data-testid="invite-email"]').type(familyMember.email);
      
      // Set permissions
      cy.get('[data-testid="permission-view"]').check();
      cy.get('[data-testid="permission-edit"]').check();
      
      cy.get('[data-testid="send-invitation"]').click();

      // Verify invitation sent
      cy.get('[data-testid="invitation-success"]')
        .should('be.visible')
        .and('contain', 'Invitation sent');

      // Verify invitation appears in list
      cy.get('[data-testid="pending-invitations"]')
        .should('contain', familyMember.email);
    });

    it('should show error for invalid email', () => {
      cy.get('[data-testid="family-sharing-button"]').click();
      cy.get('[data-testid="invite-member-button"]').click();
      cy.get('[data-testid="invite-email"]').type('invalid-email');
      cy.get('[data-testid="send-invitation"]').click();

      cy.get('[data-testid="invite-email-error"]')
        .should('be.visible')
        .and('contain', 'Invalid email');
    });

    it('should prevent duplicate invitations', () => {
      // Send first invitation
      cy.get('[data-testid="family-sharing-button"]').click();
      cy.get('[data-testid="invite-member-button"]').click();
      cy.get('[data-testid="invite-email"]').type(familyMember.email);
      cy.get('[data-testid="send-invitation"]').click();

      // Try sending second invitation
      cy.get('[data-testid="invite-member-button"]').click();
      cy.get('[data-testid="invite-email"]').type(familyMember.email);
      cy.get('[data-testid="send-invitation"]').click();

      cy.get('[data-testid="invitation-error"]')
        .should('be.visible')
        .and('contain', 'Invitation already sent');
    });
  });

  describe('Accept Invitation', () => {
    beforeEach(() => {
      // Send invitation
      cy.request({
        method: 'POST',
        url: `${Cypress.env('apiUrl')}/family/invite`,
        headers: { Authorization: `Bearer ${window.localStorage.getItem('token')}` },
        body: {
          email: familyMember.email,
          permissions: ['view', 'edit']
        }
      });

      // Logout primary user
      cy.get('[data-testid="user-menu"]').click();
      cy.get('[data-testid="logout-button"]').click();

      // Login as family member
      cy.request('POST', `${Cypress.env('apiUrl')}/auth/login`, {
        email: familyMember.email,
        password: familyMember.password
      }).then((response) => {
        window.localStorage.setItem('token', response.body.token);
      });
    });

    it('should successfully accept invitation', () => {
      cy.visit('/dashboard');
      cy.get('[data-testid="pending-invitations-badge"]').click();
      
      // Accept invitation
      cy.get(`[data-testid="invitation-${primaryUser.email}"]`)
        .find('[data-testid="accept-invitation"]')
        .click();

      // Verify connection
      cy.get('[data-testid="family-connections"]')
        .should('contain', primaryUser.firstName);

      // Verify shared medications visible
      cy.get('[data-testid="medication-list"]')
        .should('contain', medication.name);
    });

    it('should successfully decline invitation', () => {
      cy.visit('/dashboard');
      cy.get('[data-testid="pending-invitations-badge"]').click();
      
      // Decline invitation
      cy.get(`[data-testid="invitation-${primaryUser.email}"]`)
        .find('[data-testid="decline-invitation"]')
        .click();

      // Verify invitation removed
      cy.get('[data-testid="pending-invitations"]')
        .should('not.contain', primaryUser.email);

      // Verify no access to medications
      cy.get('[data-testid="medication-list"]')
        .should('not.contain', medication.name);
    });
  });

  describe('Permission Management', () => {
    beforeEach(() => {
      // Setup family connection with full permissions
      cy.request({
        method: 'POST',
        url: `${Cypress.env('apiUrl')}/family/connect`,
        headers: { Authorization: `Bearer ${window.localStorage.getItem('token')}` },
        body: {
          familyMemberId: familyMember.id,
          permissions: ['view', 'edit', 'manage']
        }
      });
    });

    it('should modify family member permissions', () => {
      cy.get('[data-testid="family-sharing-button"]').click();
      
      // Modify permissions
      cy.get(`[data-testid="member-${familyMember.email}"]`)
        .find('[data-testid="edit-permissions"]')
        .click();

      cy.get('[data-testid="permission-edit"]').uncheck();
      cy.get('[data-testid="save-permissions"]').click();

      // Verify permissions updated
      cy.get(`[data-testid="member-${familyMember.email}"]`)
        .should('contain', 'View only');
    });

    it('should remove family member', () => {
      cy.get('[data-testid="family-sharing-button"]').click();
      
      // Remove member
      cy.get(`[data-testid="member-${familyMember.email}"]`)
        .find('[data-testid="remove-member"]')
        .click();

      cy.get('[data-testid="confirm-remove"]').click();

      // Verify member removed
      cy.get('[data-testid="family-members"]')
        .should('not.contain', familyMember.email);
    });
  });

  describe('Medication Sharing', () => {
    beforeEach(() => {
      // Setup family connection
      cy.request({
        method: 'POST',
        url: `${Cypress.env('apiUrl')}/family/connect`,
        headers: { Authorization: `Bearer ${window.localStorage.getItem('token')}` },
        body: {
          familyMemberId: familyMember.id,
          permissions: ['view']
        }
      });
    });

    it('should update medication sharing settings', () => {
      cy.get('[data-testid="medication-list"]')
        .find(`[data-testid="medication-${medication.name}"]`)
        .find('[data-testid="sharing-settings"]')
        .click();

      // Modify sharing
      cy.get('[data-testid="share-with-family"]').uncheck();
      cy.get('[data-testid="save-sharing"]').click();

      // Verify medication hidden from family
      cy.request('POST', `${Cypress.env('apiUrl')}/auth/login`, {
        email: familyMember.email,
        password: familyMember.password
      }).then((response) => {
        window.localStorage.setItem('token', response.body.token);
        cy.visit('/dashboard');
        cy.get('[data-testid="medication-list"]')
          .should('not.contain', medication.name);
      });
    });
  });

  describe('Real-time Updates', () => {
    beforeEach(() => {
      // Setup family connection with view permission
      cy.request({
        method: 'POST',
        url: `${Cypress.env('apiUrl')}/family/connect`,
        headers: { Authorization: `Bearer ${window.localStorage.getItem('token')}` },
        body: {
          familyMemberId: familyMember.id,
          permissions: ['view']
        }
      });
    });

    it('should show real-time medication updates', () => {
      // Login as family member in another window
      cy.window().then((win) => {
        win.open('/dashboard', '_blank');
      });

      // Mark medication as taken
      cy.get(`[data-testid="medication-${medication.name}"]`)
        .find('[data-testid="take-button"]')
        .click();

      // Verify update in family member's window
      cy.window().then((win) => {
        cy.wrap(win)
          .find(`[data-testid="medication-${medication.name}"]`)
          .should('have.class', 'taken');
      });
    });
  });
});
