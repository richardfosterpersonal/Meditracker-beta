import { group } from 'k6';
import http from 'k6/http';
import { BASE_URL } from '../config.js';
import { checkResponse, generateRandomMedication } from '../utils.js';

export function medicationScenarios(authToken: string): void {
  group('medication', () => {
    const headers = {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    };

    // Get medication list
    const listRes = http.get(
      `${BASE_URL}/api/medications`,
      { headers }
    );
    checkResponse(listRes, 200);

    // Add new medication
    const newMed = generateRandomMedication();
    const addRes = http.post(
      `${BASE_URL}/api/medications`,
      JSON.stringify(newMed),
      { headers }
    );
    checkResponse(addRes, 201);

    // Get medication details
    const medId = addRes.json('id');
    const getRes = http.get(
      `${BASE_URL}/api/medications/${medId}`,
      { headers }
    );
    checkResponse(getRes, 200);

    // Update medication
    const updatedMed = Object.assign({}, newMed, { dosage: '200mg' });
    const updateRes = http.put(
      `${BASE_URL}/api/medications/${medId}`,
      JSON.stringify(updatedMed),
      { headers }
    );
    checkResponse(updateRes, 200);

    // Check drug interactions
    const interactionRes = http.post(
      `${BASE_URL}/api/medications/check-interactions`,
      JSON.stringify({ medication_ids: [medId] }),
      { headers }
    );
    checkResponse(interactionRes, 200);
  });
}
