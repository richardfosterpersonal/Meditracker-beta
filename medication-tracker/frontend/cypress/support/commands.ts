/// <reference types="cypress" />

declare global {
  namespace Cypress {
    interface Chainable {
      mockNotificationPermission(permission: NotificationPermission): Chainable<void>;
      mockPushSubscription(success?: boolean): Chainable<void>;
      simulateOffline(): Chainable<void>;
      simulateOnline(): Chainable<void>;
      triggerPushNotification(data: any): Chainable<void>;
    }
  }
}

Cypress.Commands.add('mockNotificationPermission', (permission: NotificationPermission) => {
  cy.window().then((win) => {
    win.Notification = {
      ...win.Notification,
      permission,
      requestPermission: () => Promise.resolve(permission),
    };
  });
});

Cypress.Commands.add('mockPushSubscription', (success = true) => {
  if (success) {
    cy.intercept('POST', '/api/push-subscriptions', {
      statusCode: 201,
      body: { success: true },
    });
  } else {
    cy.intercept('POST', '/api/push-subscriptions', {
      statusCode: 500,
      body: { error: 'Subscription failed' },
    });
  }
});

Cypress.Commands.add('simulateOffline', () => {
  cy.window().then((win) => {
    cy.stub(win.navigator, 'onLine').value(false);
    win.dispatchEvent(new Event('offline'));
  });
});

Cypress.Commands.add('simulateOnline', () => {
  cy.window().then((win) => {
    cy.stub(win.navigator, 'onLine').value(true);
    win.dispatchEvent(new Event('online'));
  });
});

Cypress.Commands.add('triggerPushNotification', (data) => {
  cy.window().then((win) => {
    const pushEvent = new CustomEvent('push', {
      detail: {
        data: {
          json: () => data,
        },
      },
    });
    win.dispatchEvent(pushEvent);
  });
});
