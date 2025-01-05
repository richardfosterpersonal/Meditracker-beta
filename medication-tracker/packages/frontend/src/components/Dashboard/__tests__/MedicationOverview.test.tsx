import React from 'react';
import { render, screen, waitFor } from '../../../tests/testUtils';
import { MedicationOverview } from '../MedicationOverview';
import { drugInfoService } from '../../../services/DrugInfoService';
import { useWebSocket } from '../../../hooks/useWebSocket';
import { useAuth } from '../../../hooks/useAuth';

// Mock the services and hooks
jest.mock('../../../services/DrugInfoService');
jest.mock('../../../hooks/useWebSocket', () => ({
  useWebSocket: jest.fn()
}));
jest.mock('../../../hooks/useAuth', () => ({
  useAuth: jest.fn()
}));

interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  startDate: string;
  reminderTime: string;
  nextDose: string;
  compliance: number;
  status: string;
  reminderEnabled: boolean;
  category: string;
  instructions: string;
}

interface DrugInfo {
  warnings: string[];
  interactions: Array<{ drugs: string[]; severity: string; }>;
}

const mockMedications: Medication[] = [
  {
    id: '1',
    name: 'Aspirin',
    dosage: '100mg',
    frequency: 'daily',
    startDate: '2024-12-09T08:00:00.000Z',
    reminderTime: '2024-12-09T09:00:00.000Z',
    nextDose: '2024-12-09T23:00:00',
    compliance: 90,
    status: 'active',
    reminderEnabled: true,
    category: 'Pain Relief',
    instructions: 'Take with food'
  },
  {
    id: '2',
    name: 'Ibuprofen',
    dosage: '200mg',
    frequency: 'twice_daily',
    startDate: '2024-12-09T08:00:00.000Z',
    reminderTime: '2024-12-09T09:00:00.000Z',
    nextDose: '2024-12-10T08:00:00',
    compliance: 85,
    status: 'active',
    reminderEnabled: true,
    category: 'Pain Relief',
    instructions: 'Take with water'
  },
];

const mockDrugInfo: Record<string, DrugInfo> = {
  'Aspirin': {
    warnings: ['May cause stomach irritation'],
    interactions: [{ drugs: ['Warfarin'], severity: 'severe' }],
  },
  'Ibuprofen': {
    warnings: [],
    interactions: [],
  },
};

describe('MedicationOverview', () => {
  beforeEach(() => {
    // Mock fetch response
    global.fetch = jest.fn().mockResolvedValue({
      json: jest.fn().mockResolvedValue(mockMedications),
    });

    // Mock drugInfoService
    (drugInfoService.getDrugInfo as jest.Mock).mockImplementation(
      (name: string) => Promise.resolve(mockDrugInfo[name])
    );

    // Mock WebSocket hook
    (useWebSocket as jest.Mock).mockReturnValue({
      lastMessage: null,
    });

    // Mock Auth hook
    (useAuth as jest.Mock).mockReturnValue({
      user: { id: 'test-user' },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    render(<MedicationOverview />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders medications after loading', async () => {
    render(<MedicationOverview />);

    await waitFor(() => {
      expect(screen.getByText('Aspirin')).toBeInTheDocument();
      expect(screen.getByText('Ibuprofen')).toBeInTheDocument();
    });

    expect(screen.getByText('100mg • daily')).toBeInTheDocument();
    expect(screen.getByText('200mg • twice_daily')).toBeInTheDocument();
  });

  it('shows warning for low remaining doses', async () => {
    render(<MedicationOverview />);

    await waitFor(() => {
      expect(screen.getByText('85% compliance')).toBeInTheDocument();
    });
  });

  it('displays drug warnings from DrugInfoService', async () => {
    render(<MedicationOverview />);

    await waitFor(() => {
      const warnings = screen.getAllByText('Warning');
      expect(warnings).toHaveLength(1); // Only Aspirin has warnings
    });
  });

  it('handles fetch error gracefully', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Failed to fetch'));

    render(<MedicationOverview />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load medication overview')).toBeInTheDocument();
    });
  });

  it('updates when receiving WebSocket message', async () => {
    const { rerender } = render(<MedicationOverview />);

    // Simulate WebSocket message
    (useWebSocket as jest.Mock).mockReturnValue({
      lastMessage: {
        data: JSON.stringify({
          type: 'MEDICATION_UPDATE',
          payload: { medicationId: '1' },
        }),
      },
    });

    rerender(<MedicationOverview />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2); // Initial + after update
    });
  });
});
