import { check } from 'k6';
import { Rate } from 'k6/metrics';

export const errorRate = new Rate('errors');

export function checkResponse(response, expectedStatus = 200) {
  const checks = {
    'status is correct': response.status === expectedStatus,
    'response is not empty': response.body && response.body.length > 0,
  };
  
  const checkResult = check(response, checks);
  errorRate.add(!checkResult);
  return checkResult;
}

export function generateRandomMedication() {
  const medications = [
    'Aspirin',
    'Ibuprofen',
    'Acetaminophen',
    'Amoxicillin',
    'Lisinopril'
  ];
  
  return {
    name: medications[Math.floor(Math.random() * medications.length)],
    dosage: `${Math.floor(Math.random() * 500)}mg`,
    frequency: Math.floor(Math.random() * 4) + 1,
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  };
}

export function generateRandomEmergencyContact() {
  const firstNames = ['John', 'Jane', 'Bob', 'Alice', 'Charlie'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones'];
  
  return {
    name: `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`,
    relationship: ['Family', 'Friend', 'Doctor', 'Caregiver'][Math.floor(Math.random() * 4)],
    phone: `+1${Math.floor(Math.random() * 1000000000).toString().padStart(10, '0')}`,
    email: `test${Math.floor(Math.random() * 1000)}@example.com`
  };
}
