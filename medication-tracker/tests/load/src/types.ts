export interface Medication {
  name: string;
  dosage: string;
  frequency: number;
  startDate: string;
  endDate: string;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  email: string;
}

export interface Config {
  scenarios: {
    [key: string]: {
      executor: string;
      startVUs: number;
      stages: Array<{
        duration: string;
        target: number;
      }>;
      gracefulRampDown: string;
    };
  };
  thresholds: {
    [key: string]: string[];
  };
}
