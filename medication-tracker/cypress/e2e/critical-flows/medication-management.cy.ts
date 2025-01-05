describe('Medication Management', () => {
  beforeEach(() => {
    cy.login('test@example.com', 'password123');
    cy.clearMedications();
  });

  it('should add a new medication with fixed time schedule', () => {
    // Add medication
    cy.addMedication('Aspirin', {
      type: 'fixed_time',
      times: ['09:00', '21:00']
    });

    // Verify medication is added
    cy.findByText('Aspirin').should('exist');
    cy.findByText('09:00').should('exist');
    cy.findByText('21:00').should('exist');
  });

  it('should handle drug interactions', () => {
    // Add first medication
    cy.addMedication('Warfarin', {
      type: 'fixed_time',
      times: ['09:00']
    });

    // Add second medication with known interaction
    cy.visit('/medications/add');
    cy.findByLabelText(/medication name/i).type('Aspirin');
    cy.findByLabelText(/schedule type/i).select('Fixed Time');
    cy.findByText(/add time/i).click();
    cy.findAllByLabelText(/time/i).last().type('09:00');

    // Check for interaction warning
    cy.findByText(/interaction warning/i).should('exist');
    cy.findByText(/warfarin/i).should('exist');
  });

  it('should validate schedule inputs', () => {
    cy.visit('/medications/add');
    cy.findByLabelText(/medication name/i).type('Test Med');
    cy.findByLabelText(/schedule type/i).select('Fixed Time');

    // Try to add invalid time
    cy.findByText(/add time/i).click();
    cy.findAllByLabelText(/time/i).last().type('25:00');
    cy.findByText(/invalid time format/i).should('exist');

    // Try to add duplicate time
    cy.findAllByLabelText(/time/i).last().clear().type('09:00');
    cy.findByText(/add time/i).click();
    cy.findAllByLabelText(/time/i).last().type('09:00');
    cy.findByText(/duplicate time/i).should('exist');
  });

  it('should handle emergency protocols', () => {
    // Add medication with emergency protocol
    cy.visit('/medications/add');
    cy.findByLabelText(/medication name/i).type('Emergency Med');
    cy.findByLabelText(/schedule type/i).select('PRN');
    cy.findByLabelText(/maximum daily doses/i).type('3');
    cy.findByLabelText(/minimum hours between doses/i).type('4');
    cy.findByLabelText(/emergency contact/i).check();
    cy.findByLabelText(/emergency phone/i).type('123-456-7890');
    
    // Save medication
    cy.findByRole('button', { name: /save/i }).click();

    // Simulate emergency scenario
    cy.visit('/medications');
    cy.findByText('Emergency Med').click();
    cy.findByText(/record dose/i).click();
    cy.findByLabelText(/dose amount/i).type('2');
    cy.findByRole('button', { name: /record/i }).click();

    // Verify emergency warning
    cy.findByText(/exceeds recommended dose/i).should('exist');
    cy.findByText(/emergency contact notified/i).should('exist');
  });

  it('should handle timezone-aware scheduling', () => {
    // Set timezone preference
    cy.visit('/settings');
    cy.findByLabelText(/timezone/i).select('America/New_York');
    cy.findByRole('button', { name: /save/i }).click();

    // Add medication
    cy.addMedication('Timezone Med', {
      type: 'fixed_time',
      times: ['09:00']
    });

    // Verify time is displayed in correct timezone
    cy.visit('/medications');
    cy.findByText('Timezone Med').click();
    cy.findByText(/next dose/i).should('include.text', '09:00 EST');
  });

  it('should track medication adherence', () => {
    // Add medication
    cy.addMedication('Adherence Med', {
      type: 'fixed_time',
      times: ['09:00']
    });

    // Record doses
    cy.visit('/medications');
    cy.findByText('Adherence Med').click();
    
    // Record taken dose
    cy.findByText(/record dose/i).click();
    cy.findByLabelText(/dose amount/i).type('1');
    cy.findByRole('button', { name: /record/i }).click();

    // Record missed dose
    cy.findByText(/record missed/i).click();
    cy.findByLabelText(/reason/i).type('Forgot');
    cy.findByRole('button', { name: /record/i }).click();

    // Check adherence report
    cy.visit('/reports');
    cy.findByText('Adherence Med').click();
    cy.findByText(/adherence rate/i).should('include.text', '50%');
  });
});
