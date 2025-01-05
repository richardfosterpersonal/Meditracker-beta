import { faker } from '@faker-js/faker';
import { createTestUser, createTestMedication } from '../support/helpers';

describe('Notification Channels', () => {
  let user;
  let medication;

  beforeEach(() => {
    // Create and login test user
    cy.loginAsNewUser().then((newUser) => {
      user = newUser;
    });

    // Create test medication
    medication = createTestMedication();
    cy.createMedication(medication);

    // Mock notification services
    cy.window().then((win) => {
      // Mock service worker
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

      // Mock notifications
      win.Notification = {
        permission: 'granted',
        requestPermission: () => Promise.resolve('granted'),
      };
    });
  });

  describe('Channel Preferences', () => {
    beforeEach(() => {
      cy.visit('/settings/notifications/channels');
    });

    it('should configure notification channels', () => {
      // Configure in-app notifications
      cy.get('[data-testid="inapp-notifications-switch"]').should('be.checked');
      cy.get('[data-testid="inapp-critical-only"]').click();
      
      // Configure push notifications
      cy.get('[data-testid="push-notifications-switch"]').click();
      cy.get('[data-testid="push-quiet-hours-start"]').type('22:00');
      cy.get('[data-testid="push-quiet-hours-end"]').type('07:00');
      
      // Configure email notifications
      cy.get('[data-testid="email-notifications-switch"]').click();
      cy.get('[data-testid="email-daily-summary"]').click();
      
      cy.get('[data-testid="save-channels"]').click();
      cy.get('[data-testid="settings-saved"]').should('be.visible');

      // Verify persistence
      cy.reload();
      cy.get('[data-testid="inapp-critical-only"]').should('be.checked');
      cy.get('[data-testid="push-notifications-switch"]').should('be.checked');
      cy.get('[data-testid="email-daily-summary"]').should('be.checked');
    });

    it('should respect quiet hours', () => {
      const now = new Date();
      const quietStart = new Date(now);
      quietStart.setHours(22, 0, 0);
      const quietEnd = new Date(now);
      quietEnd.setHours(7, 0, 0);

      // Set quiet hours
      cy.get('[data-testid="push-notifications-switch"]').click();
      cy.get('[data-testid="push-quiet-hours-start"]').type('22:00');
      cy.get('[data-testid="push-quiet-hours-end"]').type('07:00');
      cy.get('[data-testid="save-channels"]').click();

      // Mock time to quiet hours
      cy.clock(quietStart.getTime());

      // Verify notification not sent during quiet hours
      cy.window().then((win) => {
        const pushEvent = new CustomEvent('push', {
          detail: {
            data: {
              json: () => ({
                title: 'Test Notification',
                body: 'This is a test notification',
                priority: 'normal'
              }),
            },
          },
        });
        win.dispatchEvent(pushEvent);
      });

      cy.get('[data-testid="notification-received"]').should('not.exist');

      // Verify critical notifications still sent
      cy.window().then((win) => {
        const criticalEvent = new CustomEvent('push', {
          detail: {
            data: {
              json: () => ({
                title: 'Critical Alert',
                body: 'Emergency notification',
                priority: 'high'
              }),
            },
          },
        });
        win.dispatchEvent(criticalEvent);
      });

      cy.get('[data-testid="notification-received"]').should('be.visible');
    });
  });

  describe('Channel Coordination', () => {
    it('should coordinate across channels', () => {
      // Enable all channels
      cy.visit('/settings/notifications/channels');
      cy.get('[data-testid="inapp-notifications-switch"]').should('be.checked');
      cy.get('[data-testid="push-notifications-switch"]').click();
      cy.get('[data-testid="email-notifications-switch"]').click();
      cy.get('[data-testid="save-channels"]').click();

      // Mock notification event
      cy.window().then((win) => {
        const notificationId = 'test-notification';
        
        // Simulate push notification acknowledgment
        const pushEvent = new CustomEvent('push', {
          detail: {
            data: {
              json: () => ({
                id: notificationId,
                title: 'Test Notification',
                body: 'This is a test notification',
              }),
            },
          },
        });
        win.dispatchEvent(pushEvent);

        // Acknowledge notification
        cy.get('[data-testid="notification-received"]').click();

        // Verify in-app notification cleared
        cy.get(`[data-testid="notification-${notificationId}"]`)
          .should('not.exist');

        // Verify email not sent for acknowledged notification
        cy.intercept('POST', '/api/notifications/email', (req) => {
          expect(req.body.notificationId).not.to.equal(notificationId);
        });
      });
    });
  });

  describe('Delivery Reliability', () => {
    it('should handle offline notifications', () => {
      // Simulate offline mode
      cy.intercept('POST', '/api/notifications/acknowledge', {
        forceNetworkError: true
      });

      // Queue offline notification
      cy.window().then((win) => {
        const pushEvent = new CustomEvent('push', {
          detail: {
            data: {
              json: () => ({
                id: 'offline-notification',
                title: 'Offline Test',
                body: 'This is an offline test',
              }),
            },
          },
        });
        win.dispatchEvent(pushEvent);
      });

      // Verify notification queued
      cy.get('[data-testid="offline-queue"]')
        .should('contain', 'offline-notification');

      // Restore online and verify sync
      cy.intercept('POST', '/api/notifications/acknowledge', {
        statusCode: 200
      });

      cy.window().then((win) => {
        win.dispatchEvent(new Event('online'));
      });

      // Verify queue processed
      cy.get('[data-testid="offline-queue"]')
        .should('not.contain', 'offline-notification');
    });

    it('should retry failed deliveries', () => {
      let attempts = 0;
      cy.intercept('POST', '/api/notifications/send', (req) => {
        attempts++;
        if (attempts < 3) {
          req.reply({ forceNetworkError: true });
        } else {
          req.reply({ statusCode: 200 });
        }
      });

      // Trigger notification
      cy.get('[data-testid="test-notification-trigger"]').click();

      // Verify retry attempts
      cy.get('[data-testid="delivery-attempts"]')
        .should('contain', '3');

      // Verify successful delivery
      cy.get('[data-testid="notification-delivered"]')
        .should('be.visible');
    });
  });

  describe('Time Zone Handling', () => {
    it('should handle time zone changes', () => {
      // Set up medication reminder
      const reminderTime = '09:00';
      cy.visit('/medications/schedule');
      cy.get('[data-testid="medication-time"]').type(reminderTime);
      cy.get('[data-testid="save-schedule"]').click();

      // Change time zone
      cy.window().then((win) => {
        // Mock time zone change
        const newTimezone = 'America/New_York';
        win.Intl = {
          ...win.Intl,
          DateTimeFormat: () => ({
            resolvedOptions: () => ({
              timeZone: newTimezone
            })
          })
        };

        // Trigger time zone change event
        win.dispatchEvent(new Event('timezonechange'));
      });

      // Verify schedule adjusted
      cy.get('[data-testid="schedule-time"]')
        .should('not.contain', reminderTime);
    });
  });
});
