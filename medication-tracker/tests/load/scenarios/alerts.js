import { group } from 'k6';
import http from 'k6/http';
import { CONFIG } from '../config.js';
import { checkResponse } from '../utils.js';

export function alertScenarios(authToken) {
  group('alerts', () => {
    const headers = {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    };

    // Get active alerts
    const activeRes = http.get(
      `${CONFIG.baseUrl}/api/alerts/active`,
      { headers }
    );
    checkResponse(activeRes, 200);

    // Get alert history
    const historyRes = http.get(
      `${CONFIG.baseUrl}/api/alerts/history`,
      { headers }
    );
    checkResponse(historyRes, 200);

    // Update alert preferences
    const prefRes = http.put(
      `${CONFIG.baseUrl}/api/alerts/preferences`,
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

    // Acknowledge alert
    if (activeRes.json('alerts') && activeRes.json('alerts').length > 0) {
      const alertId = activeRes.json('alerts')[0].id;
      const ackRes = http.post(
        `${CONFIG.baseUrl}/api/alerts/${alertId}/acknowledge`,
        null,
        { headers }
      );
      checkResponse(ackRes, 200);
    }
  });
}
