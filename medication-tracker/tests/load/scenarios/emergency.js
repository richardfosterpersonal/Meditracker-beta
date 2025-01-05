import { group } from 'k6';
import http from 'k6/http';
import { CONFIG } from '../config.js';
import { checkResponse, generateRandomEmergencyContact } from '../utils.js';

export function emergencyScenarios(authToken) {
  group('emergency', () => {
    const headers = {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    };

    // Get emergency contacts
    const listRes = http.get(
      `${CONFIG.baseUrl}/api/emergency/contacts`,
      { headers }
    );
    checkResponse(listRes, 200);

    // Add emergency contact
    const newContact = generateRandomEmergencyContact();
    const addRes = http.post(
      `${CONFIG.baseUrl}/api/emergency/contacts`,
      JSON.stringify(newContact),
      { headers }
    );
    checkResponse(addRes, 201);

    // Trigger emergency notification
    const notifyRes = http.post(
      `${CONFIG.baseUrl}/api/emergency/notify`,
      JSON.stringify({
        contact_id: addRes.json('id'),
        message: 'Test emergency notification'
      }),
      { headers }
    );
    checkResponse(notifyRes, 200);

    // Get emergency access log
    const logRes = http.get(
      `${CONFIG.baseUrl}/api/emergency/access-log`,
      { headers }
    );
    checkResponse(logRes, 200);
  });
}
