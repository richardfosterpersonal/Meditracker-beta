import { ReactNode } from 'react';

export interface TabPanelProps {
    children?: ReactNode;
    value: number;
    index: number;
}

export interface Medication {
    id: string;
    name: string;
    dosage: string;
    frequency: string;
    timeOfDay: string[];
    remainingDoses: number;
    nextRefillDate: string;
    instructions?: string;
}

export interface MedicationSchedule {
    id: string;
    medicationId: string;
    medicationName: string;
    dosage: string;
    scheduledTime: string;
    taken: boolean;
    skipped: boolean;
}

export interface DashboardStats {
    totalMedications: number;
    adherenceRate: number;
    upcomingRefills: number;
    missedDoses: number;
}

export interface DashboardProps {
    userId?: string;
    showWelcome?: boolean;
}
