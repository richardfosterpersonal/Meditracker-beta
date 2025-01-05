import React, { createContext, useContext, useState, useCallback } from 'react';

interface Medication {
  id: string;
  name: string;
  dosage: string;
  schedule: string;
  lastTaken?: string;
  nextDue?: string;
}

interface MedicationContextType {
  medications: Medication[];
  updateMedication: (medication: Medication) => void;
  addMedication: (medication: Medication) => void;
  removeMedication: (id: string) => void;
}

const MedicationContext = createContext<MedicationContextType | undefined>(undefined);

export const MedicationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [medications, setMedications] = useState<Medication[]>([]);

  const updateMedication = useCallback((updatedMedication: Medication) => {
    setMedications(prev => 
      prev.map(med => 
        med.id === updatedMedication.id ? updatedMedication : med
      )
    );
  }, []);

  const addMedication = useCallback((newMedication: Medication) => {
    setMedications(prev => [...prev, newMedication]);
  }, []);

  const removeMedication = useCallback((id: string) => {
    setMedications(prev => prev.filter(med => med.id !== id));
  }, []);

  return (
    <MedicationContext.Provider 
      value={{ 
        medications, 
        updateMedication, 
        addMedication, 
        removeMedication 
      }}
    >
      {children}
    </MedicationContext.Provider>
  );
};

export const useMedicationContext = () => {
  const context = useContext(MedicationContext);
  if (context === undefined) {
    throw new Error('useMedicationContext must be used within a MedicationProvider');
  }
  return context;
};
