import { suite, add, cycle, complete } from 'jest-bench';
import { validateMedication, checkDrugInteractions } from './MedicationManager';

const sampleMedication = {
  id: '1',
  name: 'Aspirin',
  dosage: '100mg',
  schedule: {
    frequency: 'daily',
    times: ['09:00', '21:00']
  },
  interactions: []
};

const sampleMedications = Array(100).fill(null).map((_, i) => ({
  ...sampleMedication,
  id: String(i + 1),
  name: `Med${i + 1}`
}));

suite('MedicationManager Performance', () => {
  add('Validate Single Medication', () => {
    validateMedication(sampleMedication);
  });

  add('Check Drug Interactions (100 medications)', () => {
    checkDrugInteractions(sampleMedication, sampleMedications);
  });

  cycle();
  complete();
});
