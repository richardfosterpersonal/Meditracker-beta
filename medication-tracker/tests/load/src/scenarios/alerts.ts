import { group } from 'k6';
import http from 'k6/http';
import { BASE_URL } from '../config.js';
import { checkResponse } from '../utils.js';

export function alertScenarios(authToken: string): void {
  group('alerts', () => {
    const headers = {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    };

    // Get active alerts
    const activeRes = http.get(
      `${BASE_URL}/api/alerts/active`,
      { headers }
    );
    checkResponse(activeRes, 200);

    // Get alert history
    const historyRes = http.get(
      `${BASE_URL}/api/alerts/history`,
      { headers }
    );
    checkResponse(historyRes, 200);

    // Update alert preferences
    const prefRes = http.put(
      `${BASE_URL}/api/alerts/preferences`,
      JSON.stringify({
        email_enabled: true,
        sms_enabled: true,
        push_enabled: true,
        quiet_hours_start: '22:00',
        quiet_hours_end: '07:00'
      }),
      { headers }
    );
    checkResponse(prefRes, 200);

    // Acknowledge alert if any exists
    const alerts = activeRes.json('alerts') as Array<{ id: string }>;
    if (alerts && alerts.length > 0) {
      const alertId = alerts[0].id;
      const ackRes = http.post(
        `${BASE_URL}/api/alerts/${alertId}/acknowledge`,
        '',
        { headers }
      );
      checkResponse(ackRes, 200);
    }
  });
}
