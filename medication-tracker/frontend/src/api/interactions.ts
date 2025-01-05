import { axiosInstance } from './axiosConfig';
import {
  InteractionResult,
  SafetyAssessment,
  TimingInteraction
} from '../types/interactions';
import { Medication } from '../types/medication';

export async function checkInteractions(
  medications: Medication[]
): Promise<InteractionResult[]> {
  const response = await axiosInstance.post<InteractionResult[]>(
    '/api/interactions/check',
    { medications }
  );
  return response.data;
}

export async function getSafetyAssessment(
  medications: Medication[]
): Promise<SafetyAssessment> {
  const response = await axiosInstance.post<SafetyAssessment>(
    '/api/interactions/safety',
    { medications }
  );
  return response.data;
}

export async function validateTiming(
  medications: Medication[]
): Promise<TimingInteraction[]> {
  const response = await axiosInstance.post<TimingInteraction[]>(
    '/api/interactions/timing',
    { medications }
  );
  return response.data;
}

export async function getEmergencyInstructions(
  medications: Medication[],
  interaction: InteractionResult
): Promise<string> {
  const response = await axiosInstance.post<{ instructions: string }>(
    '/api/interactions/emergency',
    { medications, interaction }
  );
  return response.data.instructions;
}

export async function getSaferAlternatives(
  medications: Medication[],
  problematicMedication: Medication
): Promise<Medication[]> {
  const response = await axiosInstance.post<Medication[]>(
    '/api/interactions/alternatives',
    { medications, problematicMedication }
  );
  return response.data;
}
