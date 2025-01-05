export const CONFIG = {
  baseUrl: __ENV.BASE_URL || 'http://localhost:8000',
  stages: [
    // Initial validation
    { duration: '30s', target: 10 },   // Start with 10 users
    { duration: '1m', target: 25 },    // Ramp up to 25 users
    { duration: '2m', target: 25 },    // Steady state
    // Gradual increase
    { duration: '1m', target: 50 },    // Ramp up to 50 users
    { duration: '2m', target: 50 },    // Hold at 50
    // Cool down
    { duration: '30s', target: 0 }     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% of requests should be below 500ms
    http_req_failed: ['rate<0.01'],    // Less than 1% of requests should fail
    'group_duration{group:::auth}': ['p(95)<1000'],      // Auth operations
    'group_duration{group:::medication}': ['p(95)<800'],  // Medication operations
    'group_duration{group:::emergency}': ['p(95)<300'],   // Emergency operations
    'group_duration{group:::alerts}': ['p(95)<400']       // Alert operations
  },
  scenarios: {
    critical_paths: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 10 },
        { duration: '1m', target: 25 },
        { duration: '2m', target: 25 },
        { duration: '1m', target: 50 },
        { duration: '2m', target: 50 },
        { duration: '30s', target: 0 }
      ],
      gracefulRampDown: '30s'
    }
  }
};
