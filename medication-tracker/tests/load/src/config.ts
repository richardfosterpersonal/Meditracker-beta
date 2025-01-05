import { Config } from './types';

export const CONFIG: Config = {
  scenarios: {
    medication_tracker: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '30s', target: 5 },
        { duration: '1m', target: 10 },
        { duration: '30s', target: 0 }
      ],
      gracefulRampDown: '30s'
    }
  },
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01']
  }
};

export const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';
