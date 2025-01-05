import { test, expect } from '@playwright/test';
import { createHmac } from 'crypto';

// Critical security patterns for medical/health data
const sensitivePatterns = {
  medical: /medical.*record|health.*data|diagnosis|prescription/i,
  personal: /ssn|social.*security|passport/i,
  financial: /credit.*card|bank.*account/i,
};

describe('Essential Security Tests', () => {
  test('should prevent XSS attacks', async ({ page }) => {
    const xssPayload = '<script>alert("xss")</script>';
    
    await page.goto('/family');
    const nameInput = await page.getByLabel('Name');
    await nameInput.fill(xssPayload);
    
    await page.click('button:text("Add Member")');
    const content = await page.content();
    expect(content).not.toContain(xssPayload);
  });

  test('should enforce secure session handling', async ({ context }) => {
    const cookies = await context.cookies();
    const sessionCookie = cookies.find(c => c.name === 'session');

    expect(sessionCookie?.secure).toBe(true);
    expect(sessionCookie?.httpOnly).toBe(true);
    expect(sessionCookie?.sameSite).toBe('Strict');
  });

  test('should validate file uploads', async ({ page }) => {
    await page.goto('/family');
    const fileInput = await page.getByLabel('Upload');
    
    // Test file type validation
    await fileInput.setInputFiles({
      name: 'malicious.exe',
      mimeType: 'application/x-msdownload',
      buffer: Buffer.from('malicious content'),
    });

    const errorMessage = await page.getByRole('alert').textContent();
    expect(errorMessage).toContain('File type not allowed');
  });

  test('should implement secure data transmission', async ({ request }) => {
    const response = await request.get('/api/family/members');
    
    // Verify secure headers
    expect(response.headers()['strict-transport-security']).toBeDefined();
    expect(response.headers()['x-content-type-options']).toBe('nosniff');
    expect(response.headers()['x-frame-options']).toBe('DENY');
  });

  // KEEP: Critical for DoS protection
  test('should implement rate limiting', async ({ request }) => {
    // Simulate rapid requests
    const requests = Array(50).fill(null).map(() => 
      request.get('/api/family/members')
    );

    const responses = await Promise.all(requests);
    const tooManyRequests = responses.filter(r => r.status() === 429);

    // Should block after too many requests
    expect(tooManyRequests.length).toBeGreaterThan(0);
  });

  // KEEP: Critical for data protection
  test('should not expose sensitive information', async ({ request }) => {
    const response = await request.get('/api/family/members');
    const data = await response.json();
    
    // Check for any sensitive data patterns
    const hasExposedData = Object.values(sensitivePatterns).some(pattern => 
      JSON.stringify(data).match(pattern)
    );
    
    expect(hasExposedData).toBe(false);
    
    // Specific checks for medical data
    expect(JSON.stringify(data)).not.toMatch(sensitivePatterns.medical);
  });

  // KEEP: Critical for preventing unauthorized actions
  test('should protect against CSRF attacks', async ({ request }) => {
    // Try without CSRF token
    const response = await request.post('/api/family/invite', {
      data: { email: 'test@example.com' }
    });
    expect(response.status()).toBe(403);

    // Generate valid CSRF token
    const csrfToken = createHmac('sha256', process.env.CSRF_SECRET || 'test-secret')
      .update(Date.now().toString())
      .digest('hex');

    // Try with valid token
    const protectedResponse = await request.post('/api/family/invite', {
      data: { email: 'test@example.com' },
      headers: { 'X-CSRF-Token': csrfToken }
    });
    expect(protectedResponse.status()).toBe(200);
  });
});
