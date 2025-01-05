import { ApiClient } from './client';
import { Medication, MedicationLog, Supply, ApiResponse } from '../../../../shared/types';
import { validateMedication, validateMedicationLog } from '../../../../shared/validation/schemas';

export class MedicationApi {
  private client: ApiClient;
  private baseUrl = '/medications';

  constructor() {
    this.client = ApiClient.getInstance();
  }

  public async getMedications(): Promise<ApiResponse<Medication[]>> {
    return this.client.get<Medication[]>(this.baseUrl);
  }

  public async getMedicationById(id: string): Promise<ApiResponse<Medication>> {
    return this.client.get<Medication>(`${this.baseUrl}/${id}`);
  }

  public async createMedication(data: Omit<Medication, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Medication>> {
    const validatedData = validateMedication({
      ...data,
      id: '', // Placeholder for validation
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    
    return this.client.post<Medication>(this.baseUrl, validatedData);
  }

  public async updateMedication(id: string, data: Partial<Omit<Medication, 'id'>>): Promise<ApiResponse<Medication>> {
    return this.client.put<Medication>(`${this.baseUrl}/${id}`, data);
  }

  public async deleteMedication(id: string): Promise<ApiResponse<void>> {
    return this.client.delete<void>(`${this.baseUrl}/${id}`);
  }

  public async getMedicationLogs(medicationId: string): Promise<ApiResponse<MedicationLog[]>> {
    return this.client.get<MedicationLog[]>(`${this.baseUrl}/${medicationId}/logs`);
  }

  public async addMedicationLog(
    medicationId: string,
    data: Omit<MedicationLog, 'id' | 'createdAt' | 'updatedAt' | 'medicationId'>
  ): Promise<ApiResponse<MedicationLog>> {
    const validatedData = validateMedicationLog({
      ...data,
      id: '', // Placeholder for validation
      medicationId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return this.client.post<MedicationLog>(`${this.baseUrl}/${medicationId}/logs`, validatedData);
  }

  public async updateSupply(medicationId: string, supply: Partial<Supply>): Promise<ApiResponse<Medication>> {
    return this.client.patch<Medication>(`${this.baseUrl}/${medicationId}/supply`, supply);
  }

  public async getInteractions(medicationIds: string[]): Promise<ApiResponse<Array<{ medications: string[]; severity: string; description: string }>>> {
    return this.client.post<Array<{ medications: string[]; severity: string; description: string }>>(
      `${this.baseUrl}/interactions`,
      { medicationIds }
    );
  }

  public async searchMedications(query: string): Promise<ApiResponse<Array<{ id: string; name: string }>>> {
    return this.client.get<Array<{ id: string; name: string }>>(`${this.baseUrl}/search`, {
      params: { q: query },
    });
  }
}
