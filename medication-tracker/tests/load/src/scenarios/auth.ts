import { group } from 'k6';
import http from 'k6/http';
import { BASE_URL } from '../config.js';
import { checkResponse } from '../utils.js';

export function authScenarios(): void {
  group('auth', () => {
    // Login
    const loginRes = http.post(
      `${BASE_URL}/api/auth/login`,
      JSON.stringify({
        email: 'test@example.com',
        password: 'testpassword123'
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
    checkResponse(loginRes, 200);
    
    // Token refresh
    const refreshRes = http.post(
      `${BASE_URL}/api/auth/refresh`,
      JSON.stringify({
        refresh_token: loginRes.json('refresh_token')
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
    checkResponse(refreshRes, 200);
    
    // Password reset request
    const resetReqRes = http.post(
      `${BASE_URL}/api/auth/reset-password-request`,
      JSON.stringify({
        email: 'test@example.com'
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
    checkResponse(resetReqRes, 200);
  });
}
