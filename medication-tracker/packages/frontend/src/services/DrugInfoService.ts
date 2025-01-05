import axios from 'axios';

export interface DrugInfo {
  name: string;
  description: string;
  usageGuidelines: string;
  sideEffects: string[];
  warnings: string[];
  interactions: {
    drugs: string[];
    severity: 'mild' | 'moderate' | 'severe';
    description: string;
  }[];
  dosageGuidelines: {
    form: string;
    route: string;
    defaultDose: string;
    frequency: string;
    maxDailyDose: string;
    specialInstructions?: string;
  }[];
}

class DrugInfoService {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor() {
    this.baseUrl = process.env.REACT_APP_DRUG_API_URL || '';
    this.apiKey = process.env.REACT_APP_DRUG_API_KEY || '';
  }

  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    };
  }

  async getDrugInfo(drugName: string): Promise<DrugInfo> {
    try {
      const response = await axios.get(`${this.baseUrl}/drug/${encodeURIComponent(drugName)}`, {
        headers: this.getHeaders()
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching drug information:', error);
      throw new Error('Failed to fetch drug information');
    }
  }

  async checkInteractions(medications: string[]): Promise<any> {
    try {
      const response = await axios.post(`${this.baseUrl}/interactions`, {
        medications
      }, {
        headers: this.getHeaders()
      });
      return response.data;
    } catch (error) {
      console.error('Error checking drug interactions:', error);
      throw new Error('Failed to check drug interactions');
    }
  }

  async getDosageGuidelines(drugName: string, patientData: {
    age: number;
    weight: number;
    conditions: string[];
  }): Promise<any> {
    try {
      const response = await axios.post(`${this.baseUrl}/dosage/${encodeURIComponent(drugName)}`, {
        patientData
      }, {
        headers: this.getHeaders()
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching dosage guidelines:', error);
      throw new Error('Failed to fetch dosage guidelines');
    }
  }
}

export const drugInfoService = new DrugInfoService();
