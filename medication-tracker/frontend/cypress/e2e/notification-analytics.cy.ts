import { faker } from '@faker-js/faker';
import { createTestUser, createTestMedication } from '../support/helpers';

describe('Notification Analytics', () => {
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
  });

  describe('Delivery Analytics', () => {
    beforeEach(() => {
      cy.visit('/analytics/notifications');
    });

    it('should display delivery success rates', () => {
      // Verify delivery metrics are displayed
      cy.get('[data-testid="delivery-success-rate"]').should('be.visible');
      cy.get('[data-testid="delivery-failure-rate"]').should('be.visible');
      cy.get('[data-testid="delivery-retry-rate"]').should('be.visible');

      // Verify chart components
      cy.get('[data-testid="delivery-trend-chart"]').should('be.visible');
      cy.get('[data-testid="channel-success-chart"]').should('be.visible');
    });

    it('should filter analytics by date range', () => {
      // Select custom date range
      cy.get('[data-testid="date-range-picker"]').click();
      cy.get('[data-testid="date-range-last-week"]').click();

      // Verify data updates
      cy.get('[data-testid="delivery-success-rate"]')
        .should('not.contain', '--');
      
      // Change to month view
      cy.get('[data-testid="date-range-last-month"]').click();
      cy.get('[data-testid="delivery-trend-chart"]')
        .should('be.visible');
    });

    it('should show channel effectiveness comparison', () => {
      // View channel metrics
      cy.get('[data-testid="channel-metrics-tab"]').click();
      
      // Verify channel metrics
      cy.get('[data-testid="push-success-rate"]').should('be.visible');
      cy.get('[data-testid="email-success-rate"]').should('be.visible');
      cy.get('[data-testid="sms-success-rate"]').should('be.visible');

      // Compare channels
      cy.get('[data-testid="channel-comparison-chart"]')
        .should('be.visible');
    });
  });

  describe('User Engagement Analytics', () => {
    beforeEach(() => {
      cy.visit('/analytics/notifications/engagement');
    });

    it('should display user engagement metrics', () => {
      // Verify engagement metrics
      cy.get('[data-testid="open-rate"]').should('be.visible');
      cy.get('[data-testid="response-time"]').should('be.visible');
      cy.get('[data-testid="action-rate"]').should('be.visible');

      // Verify engagement charts
      cy.get('[data-testid="engagement-trend-chart"]').should('be.visible');
      cy.get('[data-testid="response-time-chart"]').should('be.visible');
    });

    it('should analyze notification preferences', () => {
      // View preference analytics
      cy.get('[data-testid="preferences-tab"]').click();

      // Verify preference metrics
      cy.get('[data-testid="channel-preference-chart"]').should('be.visible');
      cy.get('[data-testid="quiet-hours-chart"]').should('be.visible');
      cy.get('[data-testid="opt-out-rate"]').should('be.visible');
    });

    it('should show user segments', () => {
      // View user segments
      cy.get('[data-testid="segments-tab"]').click();

      // Verify segment analysis
      cy.get('[data-testid="high-engagement-segment"]').should('be.visible');
      cy.get('[data-testid="low-engagement-segment"]').should('be.visible');
      cy.get('[data-testid="at-risk-segment"]').should('be.visible');
    });
  });

  describe('Performance Analytics', () => {
    beforeEach(() => {
      cy.visit('/analytics/notifications/performance');
    });

    it('should display performance metrics', () => {
      // Verify performance metrics
      cy.get('[data-testid="delivery-time"]').should('be.visible');
      cy.get('[data-testid="processing-time"]').should('be.visible');
      cy.get('[data-testid="queue-length"]').should('be.visible');

      // Verify performance charts
      cy.get('[data-testid="performance-trend-chart"]').should('be.visible');
      cy.get('[data-testid="load-distribution-chart"]').should('be.visible');
    });

    it('should analyze system load', () => {
      // View load analytics
      cy.get('[data-testid="load-tab"]').click();

      // Verify load metrics
      cy.get('[data-testid="peak-load-chart"]').should('be.visible');
      cy.get('[data-testid="concurrent-notifications"]').should('be.visible');
      cy.get('[data-testid="resource-usage"]').should('be.visible');
    });

    it('should show error analysis', () => {
      // View error analytics
      cy.get('[data-testid="errors-tab"]').click();

      // Verify error metrics
      cy.get('[data-testid="error-rate-chart"]').should('be.visible');
      cy.get('[data-testid="error-types-chart"]').should('be.visible');
      cy.get('[data-testid="error-resolution-time"]').should('be.visible');
    });
  });

  describe('Export and Reporting', () => {
    beforeEach(() => {
      cy.visit('/analytics/notifications');
    });

    it('should export analytics data', () => {
      // Select date range
      cy.get('[data-testid="date-range-picker"]').click();
      cy.get('[data-testid="date-range-last-month"]').click();

      // Export data
      cy.get('[data-testid="export-button"]').click();
      cy.get('[data-testid="export-csv"]').click();

      // Verify download
      cy.readFile('cypress/downloads/notification-analytics.csv')
        .should('exist');
    });

    it('should generate summary report', () => {
      // Generate report
      cy.get('[data-testid="generate-report"]').click();

      // Verify report sections
      cy.get('[data-testid="delivery-summary"]').should('be.visible');
      cy.get('[data-testid="engagement-summary"]').should('be.visible');
      cy.get('[data-testid="performance-summary"]').should('be.visible');

      // Export report
      cy.get('[data-testid="export-report"]').click();
      cy.readFile('cypress/downloads/notification-report.pdf')
        .should('exist');
    });
  });
});
