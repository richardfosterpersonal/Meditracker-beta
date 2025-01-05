describe('Error Scenarios and Edge Cases', () => {
  beforeEach(() => {
    cy.login('test@example.com', 'password123');
  });

  describe('Medication Management Errors', () => {
    it('should handle network failures during medication addition', () => {
      cy.intercept('POST', '/api/medications', {
        statusCode: 500,
        delay: 1000,
        body: { error: 'Internal Server Error' }
      }).as('addMedication');

      cy.visit('/medications/add');
      cy.findByLabelText(/medication name/i).type('Test Med');
      cy.findByLabelText(/dosage/i).type('10mg');
      cy.findByRole('button', { name: /save/i }).click();

      // Verify error handling
      cy.findByText(/failed to add medication/i).should('exist');
      cy.findByText(/please try again/i).should('exist');
      
      // Verify form data persistence
      cy.findByLabelText(/medication name/i).should('have.value', 'Test Med');
      cy.findByLabelText(/dosage/i).should('have.value', '10mg');
    });

    it('should handle concurrent schedule modifications', () => {
      // Set up test data
      cy.addMedication('Concurrent Test Med', '10mg');
      
      // Simulate concurrent modification
      cy.intercept('PUT', '/api/medications/*/schedule', (req) => {
        req.reply({
          statusCode: 409,
          body: { error: 'Schedule was modified by another user' }
        });
      }).as('updateSchedule');

      cy.visit('/medications');
      cy.findByText('Concurrent Test Med').click();
      cy.findByText(/edit schedule/i).click();
      cy.findByLabelText(/time/i).type('09:00');
      cy.findByRole('button', { name: /save/i }).click();

      // Verify conflict handling
      cy.findByText(/schedule conflict detected/i).should('exist');
      cy.findByText(/refresh to see latest changes/i).should('exist');
    });

    it('should validate drug interaction detection during offline mode', () => {
      // Add medications that interact
      cy.addMedication('Warfarin', '5mg');
      cy.addMedication('Aspirin', '81mg');

      // Simulate offline mode
      cy.intercept('GET', '/api/interactions/*', {
        statusCode: 503,
        body: { error: 'Service Unavailable' }
      }).as('getInteractions');

      // Verify cached interaction check
      cy.visit('/medications');
      cy.findByText(/potential interaction detected/i).should('exist');
      cy.findByText(/using cached data/i).should('exist');
    });
  });

  describe('Emergency Protocol Edge Cases', () => {
    it('should handle multiple simultaneous emergency notifications', () => {
      // Set up emergency contacts
      cy.visit('/settings/emergency');
      cy.addEmergencyContact('Emergency 1', '123-456-7890');
      cy.addEmergencyContact('Emergency 2', '098-765-4321');

      // Trigger multiple emergencies
      cy.intercept('POST', '/api/emergency/notify', (req) => {
        if (req.body.contact === 'Emergency 1') {
          return req.reply({ statusCode: 200 });
        } else {
          return req.reply({ statusCode: 500 });
        }
      }).as('emergencyNotify');

      cy.visit('/medications');
      cy.findByText(/emergency/i).click();
      cy.findByRole('button', { name: /notify all contacts/i }).click();

      // Verify partial success handling
      cy.findByText(/some notifications failed/i).should('exist');
      cy.findByText(/emergency 1: sent/i).should('exist');
      cy.findByText(/emergency 2: failed - retrying/i).should('exist');
    });

    it('should handle timezone edge cases in emergency protocols', () => {
      // Set up medication with timezone-sensitive schedule
      const scheduleData = {
        name: 'Timezone Test Med',
        dosage: '10mg',
        schedule: {
          times: ['23:00'],
          timezone: 'America/New_York'
        }
      };

      cy.intercept('POST', '/api/medications', scheduleData).as('addMedication');
      
      // Change user timezone
      cy.visit('/settings');
      cy.findByLabelText(/timezone/i).select('Asia/Tokyo');
      cy.findByRole('button', { name: /save/i }).click();

      // Verify emergency protocol adjustments
      cy.visit('/medications');
      cy.findByText('Timezone Test Med').click();
      cy.findByText(/next dose/i).should('contain', '13:00');
      cy.findByText(/emergency window/i).should('contain', '12:00 - 14:00');
    });
  });

  describe('Data Synchronization Errors', () => {
    it('should handle offline data conflicts', () => {
      // Simulate offline changes
      cy.window().then((win) => {
        win.localStorage.setItem('offlineChanges', JSON.stringify([
          {
            type: 'schedule',
            medicationId: '123',
            changes: { time: '10:00' }
          }
        ]));
      });

      // Simulate coming back online with conflicts
      cy.intercept('POST', '/api/sync', {
        statusCode: 409,
        body: {
          conflicts: [
            {
              type: 'schedule',
              medicationId: '123',
              serverTime: '11:00',
              clientTime: '10:00'
            }
          ]
        }
      }).as('syncData');

      // Trigger sync
      cy.visit('/medications');
      cy.findByText(/sync required/i).should('exist');
      cy.findByRole('button', { name: /sync now/i }).click();

      // Verify conflict resolution
      cy.findByText(/schedule conflict detected/i).should('exist');
      cy.findByText(/select version to keep/i).should('exist');
      cy.findByText('10:00 (Your change)').should('exist');
      cy.findByText('11:00 (Server version)').should('exist');
    });

    it('should handle partial sync failures', () => {
      // Set up multiple offline changes
      cy.window().then((win) => {
        win.localStorage.setItem('offlineChanges', JSON.stringify([
          { type: 'schedule', medicationId: '1', changes: { time: '09:00' } },
          { type: 'schedule', medicationId: '2', changes: { time: '10:00' } },
          { type: 'schedule', medicationId: '3', changes: { time: '11:00' } }
        ]));
      });

      // Simulate mixed success/failure sync responses
      cy.intercept('POST', '/api/sync', {
        statusCode: 207,
        body: {
          results: [
            { medicationId: '1', status: 'success' },
            { medicationId: '2', status: 'error', message: 'Failed to sync' },
            { medicationId: '3', status: 'success' }
          ]
        }
      }).as('partialSync');

      // Verify partial sync handling
      cy.visit('/medications');
      cy.findByRole('button', { name: /sync now/i }).click();
      cy.findByText(/2 changes synced/i).should('exist');
      cy.findByText(/1 change failed/i).should('exist');
      cy.findByText(/retry failed changes/i).should('exist');
    });
  });
});
