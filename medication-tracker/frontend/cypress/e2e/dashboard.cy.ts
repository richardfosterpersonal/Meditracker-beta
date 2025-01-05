describe('Dashboard', () => {
  beforeEach(() => {
    // Mock API responses
    cy.intercept('GET', '**/api/family', {
      statusCode: 200,
      body: [
        {
          id: '1',
          firstName: 'John',
          lastName: 'Doe',
          relationship: 'Father',
        },
      ],
    }).as('getFamilyMembers');

    cy.intercept('GET', '**/api/medications', {
      statusCode: 200,
      body: [
        {
          id: '1',
          name: 'Test Medication',
          dosage: '10mg',
          status: 'active',
          nextDose: new Date().toISOString(),
        },
      ],
    }).as('getMedications');

    // Visit the dashboard page
    cy.visit('/dashboard');
  });

  it('loads and displays dashboard components', () => {
    // Wait for API calls to complete
    cy.wait(['@getFamilyMembers', '@getMedications']);

    // Check if main sections are visible
    cy.contains('h4', 'Dashboard').should('be.visible');
    cy.contains('h6', 'Medication Statistics').should('be.visible');
    cy.contains('h6', 'Family Members').should('be.visible');
    cy.contains('h6', 'Upcoming Medications').should('be.visible');
    cy.contains('h6', "Today's Schedule").should('be.visible');
  });

  it('displays family member information correctly', () => {
    cy.wait('@getFamilyMembers');

    cy.contains('John Doe').should('be.visible');
    cy.contains('Father').should('be.visible');

    // Check if action buttons are present
    cy.get('[title="View Medications"]').should('be.visible');
    cy.get('[title="Edit Member"]').should('be.visible');
  });

  it('displays medication information correctly', () => {
    cy.wait('@getMedications');

    cy.contains('Test Medication').should('be.visible');
    cy.contains('10mg').should('be.visible');
  });

  it('navigates to medication page when clicking view medications', () => {
    cy.wait('@getFamilyMembers');

    cy.get('[title="View Medications"]').click();
    cy.url().should('include', '/medications?familyMember=1');
  });

  it('navigates to edit family member page when clicking edit', () => {
    cy.wait('@getFamilyMembers');

    cy.get('[title="Edit Member"]').click();
    cy.url().should('include', '/family/edit/1');
  });

  it('handles API errors gracefully', () => {
    // Mock API error responses
    cy.intercept('GET', '**/api/family', {
      statusCode: 500,
      body: { error: 'Internal Server Error' },
    }).as('getFamilyMembersError');

    cy.intercept('GET', '**/api/medications', {
      statusCode: 500,
      body: { error: 'Internal Server Error' },
    }).as('getMedicationsError');

    cy.visit('/dashboard');

    // Check if error states are handled properly
    cy.contains('No family members added yet').should('be.visible');
    cy.contains('No upcoming medications').should('be.visible');
  });

  it('updates medication statistics in real-time', () => {
    cy.wait('@getMedications');

    // Initial check
    cy.contains('Total Medications').parent().contains('1');

    // Mock updated medications response
    cy.intercept('GET', '**/api/medications', {
      statusCode: 200,
      body: [
        {
          id: '1',
          name: 'Test Medication',
          dosage: '10mg',
          status: 'active',
          nextDose: new Date().toISOString(),
        },
        {
          id: '2',
          name: 'New Medication',
          dosage: '20mg',
          status: 'active',
          nextDose: new Date().toISOString(),
        },
      ],
    }).as('getUpdatedMedications');

    // Trigger a refresh (you might need to implement this functionality)
    cy.get('[data-testid="refresh-button"]').click();

    cy.wait('@getUpdatedMedications');

    // Check if statistics are updated
    cy.contains('Total Medications').parent().contains('2');
  });
});
