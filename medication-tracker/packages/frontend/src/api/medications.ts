import { ScheduleConfig } from '../components/ScheduleBuilder';
import axiosInstance from '../services/axiosConfig';

interface Medication {
  id: string;
  name: string;
  schedule: ScheduleConfig;
  notes?: string;
}

export async function saveMedication(data: {
  medication?: { id: string; name: string };
  schedule?: ScheduleConfig;
  notes?: string;
}): Promise<Medication> {
  const response = await axiosInstance.post<Medication>('/api/medications', {
    medicationId: data.medication?.id,
    name: data.medication?.name,
    schedule: data.schedule,
    notes: data.notes,
  });
  
  return response.data;
}

export async function fetchExistingSchedules(): Promise<ScheduleConfig[]> {
  const response = await axiosInstance.get<Medication[]>('/api/medications');
  return response.data.map(med => med.schedule);
}

export async function searchMedications(query: string): Promise<Array<{ id: string; name: string }>> {
  const response = await axiosInstance.get<Array<{ id: string; name: string }>>('/api/medications/search', {
    params: { q: query },
  });
  
  return response.data;
}

export async function getMedicationDetails(id: string): Promise<Medication> {
  const response = await axiosInstance.get<Medication>(`/api/medications/${id}`);
  return response.data;
}

export async function updateMedication(
  id: string,
  data: Partial<Omit<Medication, 'id'>>
): Promise<Medication> {
  const response = await axiosInstance.patch<Medication>(`/api/medications/${id}`, data);
  return response.data;
}

export async function deleteMedication(id: string): Promise<void> {
  await axiosInstance.delete(`/api/medications/${id}`);
}
