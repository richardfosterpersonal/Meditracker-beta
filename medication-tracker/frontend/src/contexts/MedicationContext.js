import React, { createContext, useState, useCallback, useContext } from 'react';
import { useAuth } from './AuthContext';
import { medicationService } from '../services/medicationService';
import { Medication } from '../types/medication';

interface MedicationContextType {
  medications: Medication[];
  loading: boolean;
  error: string | null;
  selectedMedication: Medication | null;
  fetchMedications: () => Promise<void>;
  addMedication: (medicationData: Partial<Medication>) => Promise<Medication>;
  updateMedication: (id: string, medicationData: Partial<Medication>) => Promise<Medication>;
  deleteMedication: (id: string) => Promise<void>;
  getMedicationsByFamilyMember: (familyMemberId: string) => Promise<Medication[]>;
  selectMedicationById: (id: string) => void;
  clearSelection: () => void;
}

const MedicationContext = createContext<MedicationContextType | undefined>(undefined);

export const MedicationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMedication, setSelectedMedication] = useState<Medication | null>(null);
  const { isAuthenticated } = useAuth();

  const fetchMedications = useCallback(async () => {
    if (!isAuthenticated) return;

    setLoading(true);
    setError(null);
    try {
      const data = await medicationService.getAllMedications();
      setMedications(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const addMedication = async (medicationData: Partial<Medication>) => {
    setLoading(true);
    setError(null);
    try {
      const newMedication = await medicationService.createMedication(medicationData);
      setMedications(prev => [...prev, newMedication]);
      return newMedication;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'An error occurred';
      setError(error);
      throw new Error(error);
    } finally {
      setLoading(false);
    }
  };

  const updateMedication = async (id: string, medicationData: Partial<Medication>) => {
    setLoading(true);
    setError(null);
    try {
      const updatedMedication = await medicationService.updateMedication(id, medicationData);
      setMedications(prev =>
        prev.map(med => med.id === id ? updatedMedication : med)
      );
      return updatedMedication;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'An error occurred';
      setError(error);
      throw new Error(error);
    } finally {
      setLoading(false);
    }
  };

  const deleteMedication = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await medicationService.deleteMedication(id);
      setMedications(prev => prev.filter(med => med.id !== id));
    } catch (err) {
      const error = err instanceof Error ? err.message : 'An error occurred';
      setError(error);
      throw new Error(error);
    } finally {
      setLoading(false);
    }
  };

  const getMedicationsByFamilyMember = async (familyMemberId: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await medicationService.getMedicationsByFamilyMember(familyMemberId);
      return data;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'An error occurred';
      setError(error);
      throw new Error(error);
    } finally {
      setLoading(false);
    }
  };

  const selectMedicationById = (id: string) => {
    const medication = medications.find(med => med.id === id);
    setSelectedMedication(medication || null);
  };

  const clearSelection = () => {
    setSelectedMedication(null);
  };

  const value = {
    medications,
    loading,
    error,
    selectedMedication,
    fetchMedications,
    addMedication,
    updateMedication,
    deleteMedication,
    getMedicationsByFamilyMember,
    selectMedicationById,
    clearSelection,
  };

  return (
    <MedicationContext.Provider value={value}>
      {children}
    </MedicationContext.Provider>
  );
};

export const useMedication = () => {
  const context = useContext(MedicationContext);
  if (context === undefined) {
    throw new Error('useMedication must be used within a MedicationProvider');
  }
  return context;
};

export default MedicationContext;
