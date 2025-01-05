describe('Family Management', () => {
  beforeEach(() => {
    // Login and navigate to family dashboard
    cy.login('test@example.com', 'password');
    cy.visit('/family');
  });

  it('should display family dashboard for subscribed users', () => {
    cy.get('[data-testid="family-dashboard"]').should('exist');
    cy.contains('Family Management').should('be.visible');
    cy.get('[data-testid="add-family-button"]').should('be.visible');
  });

  it('should show upgrade prompt for free tier users', () => {
    // Mock free tier subscription
    cy.intercept('GET', '/api/subscription', {
      statusCode: 200,
      body: { tier: 'FREE', maxFamilyMembers: 0 }
    });
    cy.reload();

    cy.contains('Upgrade to add family members').should('be.visible');
    cy.get('[data-testid="upgrade-button"]').should('be.visible');
  });

  describe('Family Member Invitation', () => {
    it('should successfully invite a family member', () => {
      cy.get('[data-testid="add-family-button"]').click();
      
      // Fill invitation form
      cy.get('[data-testid="invite-dialog"]').within(() => {
        cy.get('input[name="name"]').type('John Doe');
        cy.get('input[name="email"]').type('john@example.com');
        cy.get('select[name="relationship"]').select('CHILD');
        cy.get('[data-testid="send-invite-button"]').click();
      });

      // Verify success message
      cy.contains('Invitation sent successfully').should('be.visible');
      
      // Verify member appears in pending list
      cy.get('[data-testid="family-member-list"]')
        .contains('John Doe')
        .should('be.visible');
      cy.contains('pending').should('be.visible');
    });

    it('should handle invitation errors gracefully', () => {
      // Mock API error
      cy.intercept('POST', '/api/family/invite', {
        statusCode: 400,
        body: { message: 'Email already exists' }
      });

      cy.get('[data-testid="add-family-button"]').click();
      
      cy.get('[data-testid="invite-dialog"]').within(() => {
        cy.get('input[name="name"]').type('John Doe');
        cy.get('input[name="email"]').type('existing@example.com');
        cy.get('select[name="relationship"]').select('CHILD');
        cy.get('[data-testid="send-invite-button"]').click();
      });

      cy.contains('Email already exists').should('be.visible');
    });
  });

  describe('Permission Management', () => {
    beforeEach(() => {
      // Ensure we have a family member to work with
      cy.intercept('GET', '/api/family/members', {
        fixture: 'family-members.json'
      });
    });

    it('should update family member permissions', () => {
      // Open permissions dialog
      cy.get('[data-testid="member-menu-button"]').first().click();
      cy.get('[data-testid="edit-permissions"]').click();

      // Update permissions
      cy.get('[data-testid="permissions-dialog"]').within(() => {
        cy.get('input[name="canEditMedications"]').click();
        cy.get('input[name="canManageInventory"]').click();
        cy.get('[data-testid="save-permissions"]').click();
      });

      // Verify success message
      cy.contains('Permissions updated successfully').should('be.visible');
    });

    it('should handle permission update errors', () => {
      // Mock API error
      cy.intercept('PATCH', '/api/family/members/*/permissions', {
        statusCode: 403,
        body: { message: 'Permission denied' }
      });

      cy.get('[data-testid="member-menu-button"]').first().click();
      cy.get('[data-testid="edit-permissions"]').click();

      cy.get('[data-testid="permissions-dialog"]').within(() => {
        cy.get('input[name="canEditMedications"]').click();
        cy.get('[data-testid="save-permissions"]').click();
      });

      cy.contains('Permission denied').should('be.visible');
    });
  });

  describe('Family Member Removal', () => {
    it('should remove family member after confirmation', () => {
      cy.get('[data-testid="member-menu-button"]').first().click();
      cy.get('[data-testid="remove-member"]').click();

      // Confirm removal
      cy.get('[data-testid="confirm-dialog"]').within(() => {
        cy.contains('Remove Family Member?').should('be.visible');
        cy.get('[data-testid="confirm-remove"]').click();
      });

      // Verify success message
      cy.contains('Family member removed successfully').should('be.visible');
      
      // Verify member is removed from list
      cy.get('[data-testid="family-member-list"]')
        .should('not.contain', 'Jane Smith');
    });

    it('should cancel removal when user declines', () => {
      cy.get('[data-testid="member-menu-button"]').first().click();
      cy.get('[data-testid="remove-member"]').click();

      cy.get('[data-testid="confirm-dialog"]').within(() => {
        cy.get('[data-testid="cancel-remove"]').click();
      });

      // Verify member still exists
      cy.get('[data-testid="family-member-list"]')
        .contains('Jane Smith')
        .should('be.visible');
    });
  });

  describe('Subscription Limits', () => {
    it('should prevent adding members when limit reached', () => {
      // Mock subscription at limit
      cy.intercept('GET', '/api/subscription', {
        statusCode: 200,
        body: { 
          tier: 'FAMILY',
          maxFamilyMembers: 4,
          currentFamilyMembers: 4
        }
      });
      cy.reload();

      // Verify add button is disabled
      cy.get('[data-testid="add-family-button"]').should('be.disabled');
      cy.contains('Family member limit reached').should('be.visible');
    });

    it('should show upgrade option when limit reached', () => {
      // Mock subscription at limit
      cy.intercept('GET', '/api/subscription', {
        statusCode: 200,
        body: { 
          tier: 'FAMILY',
          maxFamilyMembers: 4,
          currentFamilyMembers: 4
        }
      });
      cy.reload();

      cy.contains('Upgrade to add more family members').should('be.visible');
      cy.get('[data-testid="upgrade-subscription"]').should('be.visible');
    });
  });
});
