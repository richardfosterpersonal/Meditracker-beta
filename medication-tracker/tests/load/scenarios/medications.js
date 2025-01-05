import { group } from 'k6';
import http from 'k6/http';
import { CONFIG } from '../config.js';
import { checkResponse, generateRandomMedication } from '../utils.js';

export function medicationScenarios(authToken) {
  group('medication', () => {
    const headers = {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    };

    // Get medication list
    const listRes = http.get(
      `${CONFIG.baseUrl}/api/medications`,
      { headers }
    );
    checkResponse(listRes, 200);

    // Add new medication
    const newMed = generateRandomMedication();
    const addRes = http.post(
      `${CONFIG.baseUrl}/api/medications`,
      JSON.stringify(newMed),
      { headers }
    );
    checkResponse(addRes, 201);

    // Get medication details
    const medId = addRes.json('id');
    const getRes = http.get(
      `${CONFIG.baseUrl}/api/medications/${medId}`,
      { headers }
    );
    checkResponse(getRes, 200);

    // Update medication
    const updateRes = http.put(
      `${CONFIG.baseUrl}/api/medications/${medId}`,
      JSON.stringify({ ...newMed, dosage: '200mg' }),
      { headers }
    );
    checkResponse(updateRes, 200);

    // Check drug interactions
    const interactionRes = http.post(
      `${CONFIG.baseUrl}/api/medications/check-interactions`,
      JSON.stringify({ medication_ids: [medId] }),
      { headers }
    );
    checkResponse(interactionRes, 200);
  });
}
