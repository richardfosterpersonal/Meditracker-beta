import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Test configuration
export const options = {
  stages: [
    { duration: '1m', target: 50 },   // Ramp up to 50 users
    { duration: '3m', target: 50 },   // Stay at 50 users
    { duration: '1m', target: 100 },  // Ramp up to 100 users
    { duration: '3m', target: 100 },  // Stay at 100 users
    { duration: '1m', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500'], // 95% of requests must complete below 500ms
    'http_req_failed': ['rate<0.01'],   // Less than 1% of requests can fail
    'errors': ['rate<0.05'],            // Less than 5% error rate
  },
};

// Simulated user behavior
export default function() {
  const BASE_URL = __ENV.API_URL || 'http://localhost:3000';
  const TOKEN = generateTestToken(); // Implement token generation for test users

  // Common headers
  const headers = {
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'application/json',
  };

  // Group: View Family Dashboard
  const dashboardResponse = http.get(`${BASE_URL}/api/family/members`, { headers });
  check(dashboardResponse, {
    'dashboard_status_200': (r) => r.status === 200,
    'dashboard_load_fast': (r) => r.timings.duration < 300,
  }) || errorRate.add(1);

  sleep(1);

  // Group: Invite Family Member
  const inviteData = {
    email: `test${Date.now()}@example.com`,
    name: 'Test User',
    relationship: 'Parent',
  };

  const inviteResponse = http.post(
    `${BASE_URL}/api/family/invite`,
    JSON.stringify(inviteData),
    { headers }
  );

  check(inviteResponse, {
    'invite_status_200': (r) => r.status === 200,
    'invite_has_id': (r) => JSON.parse(r.body).id !== undefined,
  }) || errorRate.add(1);

  sleep(2);

  // Group: Update Member Permissions
  const updateData = {
    permissions: ['VIEW', 'EDIT'],
  };

  const updateResponse = http.put(
    `${BASE_URL}/api/family/members/1/permissions`,
    JSON.stringify(updateData),
    { headers }
  );

  check(updateResponse, {
    'update_status_200': (r) => r.status === 200,
  }) || errorRate.add(1);

  sleep(1);

  // Group: Search Family Members
  const searchResponse = http.get(
    `${BASE_URL}/api/family/members/search?q=test`,
    { headers }
  );

  check(searchResponse, {
    'search_status_200': (r) => r.status === 200,
    'search_load_fast': (r) => r.timings.duration < 200,
  }) || errorRate.add(1);

  sleep(1);

  // Group: Remove Family Member
  const removeResponse = http.del(
    `${BASE_URL}/api/family/members/1`,
    null,
    { headers }
  );

  check(removeResponse, {
    'remove_status_200': (r) => r.status === 200,
  }) || errorRate.add(1);

  sleep(2);
}

// Helper function to generate test tokens
function generateTestToken() {
  // Implement token generation logic for test users
  return 'test-token-' + Date.now();
}
