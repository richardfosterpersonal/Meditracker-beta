import { group } from 'k6';
import http from 'k6/http';
import { BASE_URL } from '../config.js';
import { checkResponse, generateRandomEmergencyContact } from '../utils.js';

export function emergencyScenarios(authToken: string): void {
  group('emergency', () => {
    const headers = {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    };

    // Get emergency contacts
    const listRes = http.get(
      `${BASE_URL}/api/emergency-contacts`,
      { headers }
    );
    checkResponse(listRes, 200);

    // Add new emergency contact
    const newContact = generateRandomEmergencyContact();
    const addRes = http.post(
      `${BASE_URL}/api/emergency-contacts`,
      JSON.stringify(newContact),
      { headers }
    );
    checkResponse(addRes, 201);

    // Get emergency contact details
    const contactId = addRes.json('id');
    const getRes = http.get(
      `${BASE_URL}/api/emergency-contacts/${contactId}`,
      { headers }
    );
    checkResponse(getRes, 200);

    // Update emergency contact
    const updatedContact = Object.assign({}, newContact, { phone: '+1234567890' });
    const updateRes = http.put(
      `${BASE_URL}/api/emergency-contacts/${contactId}`,
      JSON.stringify(updatedContact),
      { headers }
    );
    checkResponse(updateRes, 200);
  });
}
