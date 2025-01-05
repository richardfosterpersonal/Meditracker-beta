import { sleep } from 'k6';
import { authScenarios } from './scenarios/auth.js';
import { medicationScenarios } from './scenarios/medications.js';
import { emergencyScenarios } from './scenarios/emergency.js';
import { alertScenarios } from './scenarios/alerts.js';
import { CONFIG } from './config.js';

export const options = CONFIG;

export default function (): void {
  // Authentication
  authScenarios();
  const authToken = 'test-token'; // In real tests, use the token from auth response

  // Core functionality tests
  medicationScenarios(authToken);
  sleep(1);

  // Emergency protocols
  emergencyScenarios(authToken);
  sleep(1);

  // Alert system
  alertScenarios(authToken);
  sleep(1);
}
