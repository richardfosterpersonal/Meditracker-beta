describe('Offline Functionality', () => {
  beforeEach(() => {
    cy.login('test@example.com', 'password123');
    cy.clearMedications();
  });

  describe('Medication Management Offline', () => {
    it('should cache and sync medication changes when offline', () => {
      // Add initial medication online
      const schedule = {
        type: 'fixed_time',
        times: ['09:00']
      };
      cy.addMedication('Test Med', schedule);

      // Go offline
      cy.simulateOffline();

      // Make offline changes
      cy.visit('/medications');
      cy.findByText('Test Med').click();
      cy.findByText(/edit schedule/i).click();
      cy.findAllByLabelText(/time/i).first().clear().type('10:00');
      cy.findByRole('button', { name: /save/i }).click();

      // Verify offline indicator
      cy.findByText(/offline changes pending/i).should('exist');

      // Verify changes stored in IndexedDB
      cy.window().then((win) => {
        const request = win.indexedDB.open('MediTracker', 1);
        request.onsuccess = (event: any) => {
          const db = event.target.result;
          const tx = db.transaction('offlineChanges', 'readonly');
          const store = tx.objectStore('offlineChanges');
          const getReq = store.getAll();
          getReq.onsuccess = () => {
            expect(getReq.result).to.have.length(1);
            expect(getReq.result[0].type).to.equal('schedule');
          };
        };
      });

      // Come back online
      cy.simulateOnline();

      // Verify sync process
      cy.findByText(/syncing changes/i).should('exist');
      cy.findByText(/changes synced successfully/i).should('exist');

      // Verify changes persisted
      cy.reload();
      cy.findByText('Test Med').click();
      cy.findAllByLabelText(/time/i).first().should('have.value', '10:00');
    });

    it('should handle medication reminders offline', () => {
      // Set up medication with immediate reminder
      const now = new Date();
      const reminderTime = new Date(now.getTime() + 2000); // 2 seconds from now
      const schedule = {
        type: 'fixed_time',
        times: [reminderTime.toLocaleTimeString('en-US', { hour12: false })]
      };
      cy.addMedication('Reminder Test', schedule);

      // Go offline
      cy.simulateOffline();

      // Wait for reminder time
      cy.wait(2500);

      // Verify offline reminder
      cy.findByText(/medication reminder/i).should('exist');
      cy.findByText('Reminder Test').should('exist');

      // Mark as taken offline
      cy.findByRole('button', { name: /mark as taken/i }).click();
      cy.findByText(/saved offline/i).should('exist');

      // Come back online
      cy.simulateOnline();

      // Verify sync
      cy.findByText(/syncing/i).should('exist');
      cy.findByText(/synced/i).should('exist');

      // Verify adherence record
      cy.visit('/adherence');
      cy.findByText('Reminder Test').should('exist');
      cy.findByText(/taken/i).should('exist');
    });
  });

  describe('Emergency Features Offline', () => {
    it('should maintain emergency contact access offline', () => {
      // Add emergency contacts
      cy.visit('/settings/emergency');
      cy.addEmergencyContact('Emergency Contact 1', '123-456-7890');
      cy.addEmergencyContact('Emergency Contact 2', '098-765-4321');

      // Go offline
      cy.simulateOffline();

      // Verify emergency contacts accessible
      cy.visit('/emergency');
      cy.findByText('Emergency Contact 1').should('exist');
      cy.findByText('123-456-7890').should('exist');
      cy.findByText('Emergency Contact 2').should('exist');
      cy.findByText('098-765-4321').should('exist');
    });

    it('should queue emergency notifications when offline', () => {
      // Set up emergency contact
      cy.visit('/settings/emergency');
      cy.addEmergencyContact('Emergency Contact', '123-456-7890');

      // Go offline
      cy.simulateOffline();

      // Trigger emergency
      cy.visit('/emergency');
      cy.findByRole('button', { name: /trigger emergency/i }).click();

      // Verify notification queued
      cy.findByText(/emergency notification queued/i).should('exist');

      // Come back online
      cy.simulateOnline();

      // Verify notifications sent
      cy.findByText(/sending queued notifications/i).should('exist');
      cy.findByText(/notifications sent/i).should('exist');
    });
  });

  describe('Data Persistence', () => {
    it('should maintain medication history offline', () => {
      // Add medication and history
      const schedule = {
        type: 'fixed_time',
        times: ['09:00']
      };
      cy.addMedication('History Test', schedule);
      
      // Add some history
      cy.visit('/medications');
      cy.findByText('History Test').click();
      cy.findByText(/log dose/i).click();
      cy.findByLabelText(/notes/i).type('Test note');
      cy.findByRole('button', { name: /save/i }).click();

      // Go offline
      cy.simulateOffline();

      // Verify history accessible
      cy.visit('/medications');
      cy.findByText('History Test').click();
      cy.findByText(/history/i).click();
      cy.findByText('Test note').should('exist');
    });

    it('should handle schedule changes with timezone shifts offline', () => {
      // Add medication with timezone-aware schedule
      const schedule = {
        type: 'fixed_time',
        times: ['09:00'],
        timezone: 'America/New_York'
      };
      cy.addMedication('Timezone Test', schedule);

      // Go offline
      cy.simulateOffline();

      // Change timezone
      cy.visit('/settings');
      cy.findByLabelText(/timezone/i).select('Asia/Tokyo');
      cy.findByRole('button', { name: /save/i }).click();

      // Verify schedule adjusted
      cy.visit('/medications');
      cy.findByText('Timezone Test').click();
      cy.findByText(/next dose/i).should('contain', '22:00');

      // Come back online
      cy.simulateOnline();

      // Verify timezone change synced
      cy.reload();
      cy.findByText('Timezone Test').click();
      cy.findByText(/next dose/i).should('contain', '22:00');
    });
  });
});
