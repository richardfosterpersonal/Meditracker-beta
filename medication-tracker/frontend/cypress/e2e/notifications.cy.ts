describe('Notification System', () => {
  beforeEach(() => {
    // Mock service worker registration
    cy.window().then((win) => {
      win.navigator.serviceWorker = {
        ready: Promise.resolve({
          pushManager: {
            getSubscription: () => Promise.resolve(null),
            subscribe: () => Promise.resolve({
              endpoint: 'https://fcm.googleapis.com/fcm/send/mock-endpoint',
              keys: {
                p256dh: 'mock-p256dh-key',
                auth: 'mock-auth-key',
              },
            }),
          },
          showNotification: () => Promise.resolve(),
        }),
      };
    });

    // Mock notification permissions
    cy.window().then((win) => {
      win.Notification = {
        permission: 'default',
        requestPermission: () => Promise.resolve('granted'),
      };
    });

    // Clear local storage before each test
    cy.clearLocalStorage();
  });

  describe('Notification Settings Page', () => {
    it('should display notification settings correctly', () => {
      cy.visit('/settings/notifications');
      cy.get('[data-testid="notification-settings"]').should('exist');
      cy.get('[data-testid="enable-notifications-btn"]').should('be.visible');
    });

    it('should handle permission request flow', () => {
      cy.visit('/settings/notifications');
      cy.get('[data-testid="enable-notifications-btn"]').click();
      cy.get('[data-testid="notification-success"]').should('be.visible');
      cy.get('[data-testid="settings-switches"]').should('not.be.disabled');
    });

    it('should save notification preferences', () => {
      cy.visit('/settings/notifications');
      cy.get('[data-testid="enable-notifications-btn"]').click();
      cy.get('[data-testid="medication-reminders-switch"]').click();
      cy.get('[data-testid="save-success-toast"]').should('be.visible');
      
      // Verify persistence
      cy.reload();
      cy.get('[data-testid="medication-reminders-switch"]').should('not.be.checked');
    });
  });

  describe('Medication Reminders', () => {
    beforeEach(() => {
      // Set up notification permissions
      cy.window().then((win) => {
        win.Notification.permission = 'granted';
      });

      // Mock a medication schedule
      cy.intercept('GET', '/api/medications/schedule', {
        statusCode: 200,
        body: [{
          id: '1',
          name: 'Test Med',
          time: new Date().toISOString(),
        }],
      });
    });

    it('should schedule notifications for new medications', () => {
      cy.visit('/medications/add');
      cy.get('[data-testid="medication-name"]').type('Test Medication');
      cy.get('[data-testid="medication-time"]').type('12:00');
      cy.get('[data-testid="submit-medication"]').click();
      cy.get('[data-testid="notification-scheduled"]').should('be.visible');
    });

    it('should handle offline notification scheduling', () => {
      // Simulate offline mode
      cy.intercept('POST', '/api/notifications', {
        forceNetworkError: true,
      });

      cy.visit('/medications/add');
      cy.get('[data-testid="medication-name"]').type('Offline Test Med');
      cy.get('[data-testid="medication-time"]').type('14:00');
      cy.get('[data-testid="submit-medication"]').click();
      cy.get('[data-testid="offline-notification-queued"]').should('be.visible');
    });
  });

  describe('Push Notification Integration', () => {
    beforeEach(() => {
      // Mock push subscription
      cy.intercept('POST', '/api/push-subscriptions', {
        statusCode: 201,
      });
    });

    it('should handle push subscription flow', () => {
      cy.visit('/settings/notifications');
      cy.get('[data-testid="enable-notifications-btn"]').click();
      cy.get('[data-testid="push-subscription-success"]').should('be.visible');
    });

    it('should handle push notification reception', () => {
      // Mock receiving a push notification
      cy.window().then((win) => {
        const pushEvent = new CustomEvent('push', {
          detail: {
            data: {
              json: () => ({
                title: 'Test Notification',
                body: 'This is a test notification',
              }),
            },
          },
        });
        win.dispatchEvent(pushEvent);
      });

      cy.get('[data-testid="notification-received"]').should('be.visible');
    });
  });

  describe('Error Handling', () => {
    it('should handle permission denial gracefully', () => {
      cy.window().then((win) => {
        win.Notification.requestPermission = () => Promise.resolve('denied');
      });

      cy.visit('/settings/notifications');
      cy.get('[data-testid="enable-notifications-btn"]').click();
      cy.get('[data-testid="permission-denied-message"]').should('be.visible');
    });

    it('should handle network errors in notification settings', () => {
      cy.intercept('PUT', '/api/notification-settings', {
        forceNetworkError: true,
      });

      cy.visit('/settings/notifications');
      cy.get('[data-testid="medication-reminders-switch"]').click();
      cy.get('[data-testid="network-error-message"]').should('be.visible');
    });
  });
});
