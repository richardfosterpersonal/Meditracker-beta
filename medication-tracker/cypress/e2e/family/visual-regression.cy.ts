import 'cypress-visual-regression';

describe('Family Management Visual Tests', () => {
  beforeEach(() => {
    cy.login('test@example.com', 'password');
    cy.visit('/family');
    cy.viewport('iphone-x'); // Test mobile viewport first
  });

  it('should match dashboard snapshot', () => {
    cy.get('[data-testid="family-dashboard"]').should('be.visible');
    cy.matchImageSnapshot('family-dashboard-mobile');
  });

  it('should match invite dialog snapshot', () => {
    cy.get('[data-testid="add-family-button"]').click();
    cy.get('[data-testid="invite-dialog"]').should('be.visible');
    cy.matchImageSnapshot('invite-dialog-mobile');
  });

  it('should match error states', () => {
    // Mock API error
    cy.intercept('POST', '/api/family/invite', {
      statusCode: 400,
      body: { message: 'Invalid email format' }
    });

    cy.get('[data-testid="add-family-button"]').click();
    cy.get('input[name="email"]').type('invalid-email');
    cy.get('[data-testid="send-invite-button"]').click();
    cy.get('[role="alert"]').should('be.visible');
    cy.matchImageSnapshot('error-state-mobile');
  });

  it('should match loading states', () => {
    cy.intercept('GET', '/api/family/members', (req) => {
      req.on('response', (res) => {
        res.setDelay(1000);
      });
    });
    cy.reload();
    cy.get('[role="progressbar"]').should('be.visible');
    cy.matchImageSnapshot('loading-state-mobile');
  });

  // Test different themes
  it('should match dark theme snapshot', () => {
    cy.get('[data-testid="theme-toggle"]').click(); // Assuming you have a theme toggle
    cy.get('[data-testid="family-dashboard"]').should('be.visible');
    cy.matchImageSnapshot('family-dashboard-dark-mobile');
  });

  // Test different device sizes
  const devices = ['ipad-2', 'macbook-13', 'samsung-s10'];
  devices.forEach(device => {
    it(`should match ${device} snapshot`, () => {
      cy.viewport(device);
      cy.get('[data-testid="family-dashboard"]').should('be.visible');
      cy.matchImageSnapshot(`family-dashboard-${device}`);
    });
  });

  // Test accessibility features visual representation
  it('should match high contrast mode snapshot', () => {
    cy.get('[data-testid="accessibility-toggle"]').click();
    cy.get('[data-testid="family-dashboard"]').should('be.visible');
    cy.matchImageSnapshot('family-dashboard-high-contrast');
  });

  // Test RTL layout
  it('should match RTL layout snapshot', () => {
    cy.get('[data-testid="language-selector"]').click();
    cy.get('[data-value="ar"]').click(); // Arabic for RTL testing
    cy.get('[data-testid="family-dashboard"]').should('be.visible');
    cy.matchImageSnapshot('family-dashboard-rtl');
  });

  // Test different font sizes
  it('should match large font size snapshot', () => {
    cy.get('[data-testid="font-size-increase"]').click();
    cy.get('[data-testid="family-dashboard"]').should('be.visible');
    cy.matchImageSnapshot('family-dashboard-large-font');
  });
});
