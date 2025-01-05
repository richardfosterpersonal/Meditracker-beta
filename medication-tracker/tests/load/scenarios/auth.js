import { group } from 'k6';
import http from 'k6/http';
import { CONFIG } from '../config.js';
import { checkResponse } from '../utils.js';

export function authScenarios() {
  group('auth', () => {
    // Login
    const loginRes = http.post(`${CONFIG.baseUrl}/api/auth/login`, {
      email: 'test@example.com',
      password: 'testpassword123'
    });
    checkResponse(loginRes, 200);
    
    // Token refresh
    const refreshRes = http.post(`${CONFIG.baseUrl}/api/auth/refresh`, {
      refresh_token: loginRes.json('refresh_token')
    });
    checkResponse(refreshRes, 200);
    
    // Password reset request
    const resetReqRes = http.post(`${CONFIG.baseUrl}/api/auth/reset-password-request`, {
      email: 'test@example.com'
    });
    checkResponse(resetReqRes, 200);
  });
}
