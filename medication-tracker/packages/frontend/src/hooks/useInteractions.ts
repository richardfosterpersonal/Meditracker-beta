import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  checkInteractions,
  getSafetyAssessment,
  validateTiming,
  getEmergencyInstructions,
  getSaferAlternatives
} from '../api/interactions';
import { Medication } from '../types/medication';
import { InteractionResult } from '../types/interactions';

export function useInteractionCheck(medications: Medication[]) {
  return useQuery({
    queryKey: ['interactions', medications.map(m => m.id)],
    queryFn: () => checkInteractions(medications),
    enabled: medications.length >= 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useSafetyAssessment(medications: Medication[]) {
  return useQuery({
    queryKey: ['safety', medications.map(m => m.id)],
    queryFn: () => getSafetyAssessment(medications),
    enabled: medications.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}

export function useTimingValidation(medications: Medication[]) {
  return useQuery({
    queryKey: ['timing', medications.map(m => m.id)],
    queryFn: () => validateTiming(medications),
    enabled: medications.length >= 2,
    staleTime: 5 * 60 * 1000,
  });
}

export function useEmergencyInstructions() {
  return useMutation({
    mutationFn: ({
      medications,
      interaction,
    }: {
      medications: Medication[];
      interaction: InteractionResult;
    }) => getEmergencyInstructions(medications, interaction),
  });
}

export function useSaferAlternatives() {
  return useMutation({
    mutationFn: ({
      medications,
      problematicMedication,
    }: {
      medications: Medication[];
      problematicMedication: Medication;
    }) => getSaferAlternatives(medications, problematicMedication),
  });
}

// Utility hook for managing interaction state
export function useInteractionManager(medications: Medication[]) {
  const queryClient = useQueryClient();
  
  const interactionCheck = useInteractionCheck(medications);
  const safetyAssessment = useSafetyAssessment(medications);
  const timingValidation = useTimingValidation(medications);
  const emergencyInstructions = useEmergencyInstructions();
  const saferAlternatives = useSaferAlternatives();

  const invalidateInteractions = () => {
    queryClient.invalidateQueries({ queryKey: ['interactions'] });
    queryClient.invalidateQueries({ queryKey: ['safety'] });
    queryClient.invalidateQueries({ queryKey: ['timing'] });
  };

  const hasUnsafeInteractions = interactionCheck.data?.some(
    interaction => interaction.severity === 'severe' || interaction.severity === 'high'
  );

  const requiresImmediateAttention = interactionCheck.data?.some(
    interaction => interaction.requiresImmediateAttention
  );

  const hasSafetyIssues = safetyAssessment.data?.score
    ? safetyAssessment.data.score < 0.6
    : false;

  const hasTimingConflicts = timingValidation.data?.length > 0;

  return {
    // Queries
    interactionCheck,
    safetyAssessment,
    timingValidation,
    
    // Mutations
    emergencyInstructions,
    saferAlternatives,
    
    // Utility functions
    invalidateInteractions,
    
    // Derived state
    hasUnsafeInteractions,
    requiresImmediateAttention,
    hasSafetyIssues,
    hasTimingConflicts,
    
    // Loading states
    isLoading:
      interactionCheck.isLoading ||
      safetyAssessment.isLoading ||
      timingValidation.isLoading,
    
    // Error states
    isError:
      interactionCheck.isError ||
      safetyAssessment.isError ||
      timingValidation.isError,
    
    // Combined error message
    error:
      interactionCheck.error ||
      safetyAssessment.error ||
      timingValidation.error,
  };
}
