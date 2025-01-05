import { check } from 'k6';
import { RefinedResponse, Response } from 'k6/http';
import { EmergencyContact, Medication } from './types';

let errorCount = 0;

export function checkResponse(response: Response | RefinedResponse<'text'>, expectedStatus = 200): boolean {
  const result = check(response, {
    'status is correct': (r) => r.status === expectedStatus,
    'response is not empty': (r) => !!r.body
  });
  
  if (!result) {
    errorCount++;
  }
  return result;
}

export function generateRandomMedication(): Medication {
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

export function generateRandomEmergencyContact(): EmergencyContact {
  const firstNames = ['John', 'Jane', 'Bob', 'Alice', 'Charlie'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones'];
  
  return {
    name: `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`,
    relationship: ['Family', 'Friend', 'Doctor', 'Caregiver'][Math.floor(Math.random() * 4)],
    phone: `+1${Math.floor(Math.random() * 1000000000).toString().padStart(10, '0')}`,
    email: `test${Math.floor(Math.random() * 1000)}@example.com`
  };
}
