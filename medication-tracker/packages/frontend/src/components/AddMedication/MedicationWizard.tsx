import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Button,
  Progress,
  Text,
  VStack,
  HStack,
  useToast,
  Image,
  Heading,
  Container,
  Card,
  CardBody,
  Icon,
  Tooltip,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import { FaRegQuestionCircle, FaCheck, FaArrowRight } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { ScheduleBuilder, ScheduleConfig } from '../ScheduleBuilder';
import { validateSchedule, detectConflicts, ValidationError } from '../../utils/scheduleValidation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { saveMedication, fetchExistingSchedules, fetchExistingMedications, fetchMedicationDetails } from '../../api/medications';
import { useInteractionManager } from '../../hooks/useInteractions';
import { InteractionWarningDialog } from '../Interactions/InteractionWarningDialog';
import { SafetyScoreDisplay } from '../Interactions/SafetyScoreDisplay';
import { EmergencyInstructionsModal } from '../Interactions/EmergencyInstructionsModal';
import MedicationErrorBoundary from '../ErrorBoundary/MedicationErrorBoundary';
import LoadingState from '../common/LoadingState';

interface WizardStep {
  title: string;
  description: string;
  imageUrl?: string;
  component: React.ReactNode;
  validate?: () => boolean;
}

const MotionBox = motion(Box);

export const MedicationWizard: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [showInteractionWarning, setShowInteractionWarning] = useState(false);
  const [showEmergencyInstructions, setShowEmergencyInstructions] = useState(false);
  const [selectedInteraction, setSelectedInteraction] = useState<InteractionResult | null>(null);

  const [formData, setFormData] = useState<{
    medication?: { id: string; name: string };
    schedule?: ScheduleConfig;
    notes?: string;
  }>({});

  const [isLoading, setIsLoading] = useState(false);

  const [medicationDetails, setMedicationDetails] = useState<any>(null);

  const toast = useToast();

  const { data: existingSchedules, data: existingMedications } = useQuery({
    queryKey: ['medications'],
    queryFn: fetchExistingMedications
  });

  const { data: medDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['medicationDetails', formData.medication?.name],
    queryFn: () => fetchMedicationDetails(formData.medication?.name as string),
    enabled: !!formData.medication?.name,
  });

  useEffect(() => {
    if (medDetails) {
      setMedicationDetails(medDetails);
    }
  }, [medDetails]);

  const {
    interactionCheck,
    safetyAssessment,
    timingValidation,
    emergencyInstructions,
    hasUnsafeInteractions,
    requiresImmediateAttention,
    hasSafetyIssues,
    hasTimingConflicts,
    isLoading: isCheckingInteractions
  } = useInteractionManager(
    existingMedications
      ? [...existingMedications, formData.medication as Medication]
      : []
  );

  const saveMedicationMutation = useMutation({
    mutationFn: saveMedication,
    onSuccess: () => {
      toast({
        title: 'Medication added successfully',
        status: 'success',
        duration: 3000,
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to add medication',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    },
  });

  const handleScheduleChange = useCallback((schedule: ScheduleConfig) => {
    const validationErrors = validateSchedule(schedule);
    let conflicts: ValidationError[] = [];
    
    if (existingSchedules) {
      conflicts = detectConflicts(existingSchedules, schedule);
    }

    if (validationErrors.length > 0 || conflicts.length > 0) {
      const allErrors = [...validationErrors, ...conflicts];
      allErrors.forEach(error => {
        toast({
          title: 'Schedule Warning',
          description: error.message,
          status: 'warning',
          duration: 5000,
          isClosable: true,
        });
      });
    }

    setFormData(prev => ({ ...prev, schedule }));
  }, [existingSchedules, toast]);

  const handleNext = async () => {
    const currentStepData = steps[currentStep];
    if (currentStepData.validate && !currentStepData.validate()) {
      toast({
        title: 'Required Information Missing',
        description: 'Please complete all required fields before continuing.',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    // Check for interactions before final submission
    if (currentStep === steps.length - 1) {
      if (isCheckingInteractions) {
        toast({
          title: 'Please wait',
          description: 'Checking for medication interactions...',
          status: 'info',
          duration: 2000,
        });
        return;
      }

      if (requiresImmediateAttention) {
        setSelectedInteraction(
          interactionCheck.data?.find(i => i.requiresImmediateAttention) || null
        );
        setShowEmergencyInstructions(true);
        return;
      }

      if (hasUnsafeInteractions || hasSafetyIssues) {
        setShowInteractionWarning(true);
        return;
      }

      setIsLoading(true);
      try {
        saveMedicationMutation.mutate(formData);
      } catch (error) {
        toast({
          title: 'Failed to add medication',
          description: error.message,
          status: 'error',
          duration: 5000,
        });
      } finally {
        setIsLoading(false);
      }
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleInteractionProceed = () => {
    setShowInteractionWarning(false);
    setIsLoading(true);
    try {
      saveMedicationMutation.mutate(formData);
    } catch (error) {
      toast({
        title: 'Failed to add medication',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInteractionModify = () => {
    setShowInteractionWarning(false);
    setCurrentStep(1); // Go back to schedule step
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(0, prev - 1));
  };

  const steps: WizardStep[] = [
    {
      title: "Let's Add Your Medication",
      description: "First, tell us what medication you're adding",
      component: (
        <Box>
          <Text fontSize="lg" mb={4}>
            Search for your medication or select from common options:
          </Text>
          {/* MedicationSearch component would go here */}
        </Box>
      ),
      validate: () => Boolean(formData.medication),
    },
    {
      title: "Medication Information",
      description: "View detailed information about your medication",
      component: renderMedicationInfo(),
    },
    {
      title: "Schedule Setup",
      description: "Set up when you'll take this medication",
      component: (
        <Box>
          <ScheduleBuilder
            onScheduleChange={handleScheduleChange}
            initialSchedule={formData.schedule}
            medicationName={formData.medication?.name || ''}
          />
          {formData.schedule && (
            <Alert status="info" mt={4}>
              <AlertIcon />
              Schedule validation is running automatically
            </Alert>
          )}
          {hasTimingConflicts && (
            <Alert status="warning" mt={4}>
              <AlertIcon />
              Potential timing conflicts detected
            </Alert>
          )}
        </Box>
      ),
      validate: () => Boolean(formData.schedule),
    },
    {
      title: "Additional Notes",
      description: "Add any special instructions or notes",
      component: (
        <Box>
          {/* Notes component would go here */}
        </Box>
      ),
    },
    {
      title: "Review",
      description: "Review and confirm your medication details",
      component: (
        <Card>
          <CardBody>
            <VStack align="stretch" spacing={4}>
              <Box>
                <Text fontWeight="bold">Medication:</Text>
                <Text>{formData.medication?.name}</Text>
              </Box>
              <Box>
                <Text fontWeight="bold">Schedule:</Text>
                <Text>{JSON.stringify(formData.schedule, null, 2)}</Text>
              </Box>
              <Box>
                <Text fontWeight="bold">Notes:</Text>
                <Text>{formData.notes || 'No additional notes'}</Text>
              </Box>
              {safetyAssessment.data && (
                <Box>
                  <Text fontWeight="bold" mb={2}>Safety Assessment:</Text>
                  <SafetyScoreDisplay
                    assessment={safetyAssessment.data}
                    compact={true}
                  />
                </Box>
              )}
            </VStack>
          </CardBody>
        </Card>
      ),
    },
  ];

  const renderMedicationInfo = () => {
    if (!medicationDetails) return null;

    return (
      <VStack spacing={4} align="stretch" w="100%">
        <Card>
          <CardBody>
            <VStack spacing={3} align="stretch">
              <Heading size="md">Medication Information</Heading>
              <Text><strong>Generic Name:</strong> {medicationDetails.basic_info.generic_name}</Text>
              <Text><strong>Brand Name:</strong> {medicationDetails.basic_info.brand_name}</Text>
              <Text><strong>Description:</strong> {medicationDetails.basic_info.description}</Text>
              <Text><strong>Route:</strong> {medicationDetails.basic_info.route}</Text>
            </VStack>
          </CardBody>
        </Card>

        {medicationDetails.warnings.length > 0 && (
          <Alert status="warning">
            <AlertIcon />
            <VStack align="stretch" spacing={2}>
              <Text fontWeight="bold">Important Warnings:</Text>
              {medicationDetails.warnings.map((warning: string, index: number) => (
                <Text key={index}>{warning}</Text>
              ))}
            </VStack>
          </Alert>
        )}

        {medicationDetails.dosage && (
          <Card>
            <CardBody>
              <VStack spacing={3} align="stretch">
                <Heading size="md">Dosage Information</Heading>
                <Text><strong>Recommended Dosage:</strong> {medicationDetails.dosage.recommended_dosage}</Text>
                <Text><strong>Frequency:</strong> {medicationDetails.dosage.frequency}</Text>
                <Text><strong>Maximum Daily Dose:</strong> {medicationDetails.dosage.max_daily_dose}</Text>
                {medicationDetails.dosage.special_populations && (
                  <Text>
                    <strong>Special Populations:</strong> {medicationDetails.dosage.special_populations}
                  </Text>
                )}
              </VStack>
            </CardBody>
          </Card>
        )}

        {medicationDetails.interactions.length > 0 && (
          <Card>
            <CardBody>
              <VStack spacing={3} align="stretch">
                <Heading size="md">Known Interactions</Heading>
                {medicationDetails.interactions.map((interaction: any, index: number) => (
                  <Box key={index} p={3} bg="gray.50" borderRadius="md">
                    <Text><strong>Interacting Drug:</strong> {interaction.interacting_drug}</Text>
                    <Text><strong>Severity:</strong> {interaction.severity}</Text>
                    <Text><strong>Description:</strong> {interaction.description}</Text>
                    {interaction.recommendation && (
                      <Text><strong>Recommendation:</strong> {interaction.recommendation}</Text>
                    )}
                  </Box>
                ))}
              </VStack>
            </CardBody>
          </Card>
        )}
      </VStack>
    );
  };

  if (isLoading) {
    return (
      <LoadingState
        type="component"
        message="Processing medication information..."
        loadingId="medication_wizard_submit"
      />
    );
  }

  return (
    <MedicationErrorBoundary>
      <Container maxW="container.md" py={8}>
        <VStack spacing={8} align="stretch">
          <Progress
            value={(currentStep / (steps.length - 1)) * 100}
            size="sm"
            colorScheme="blue"
          />
          
          <AnimatePresence mode="wait">
            <MotionBox
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <VStack spacing={4} align="stretch">
                <Heading size="lg">{steps[currentStep].title}</Heading>
                <Text color="gray.600">{steps[currentStep].description}</Text>
                {steps[currentStep].component}
              </VStack>
            </MotionBox>
          </AnimatePresence>

          <HStack justify="space-between" pt={4}>
            <Button
              onClick={handleBack}
              isDisabled={currentStep === 0}
              variant="ghost"
            >
              Back
            </Button>
            <Button
              onClick={handleNext}
              colorScheme="blue"
              rightIcon={currentStep === steps.length - 1 ? <FaCheck /> : <FaArrowRight />}
              isLoading={saveMedicationMutation.isPending || isCheckingInteractions}
            >
              {currentStep === steps.length - 1 ? 'Add Medication' : 'Next'}
            </Button>
          </HStack>
        </VStack>

        {/* Interaction Warning Dialog */}
        <InteractionWarningDialog
          isOpen={showInteractionWarning}
          onClose={() => setShowInteractionWarning(false)}
          onProceed={handleInteractionProceed}
          onModify={handleInteractionModify}
          interactions={interactionCheck.data || []}
          medications={existingMedications || []}
          safetyAssessment={safetyAssessment.data!}
        />

        {/* Emergency Instructions Modal */}
        {selectedInteraction && (
          <EmergencyInstructionsModal
            isOpen={showEmergencyInstructions}
            onClose={() => setShowEmergencyInstructions(false)}
            interaction={selectedInteraction}
            medications={existingMedications || []}
            emergencyInstructions={emergencyInstructions.data || ''}
            emergencyContacts={[
              'Emergency Services: 911',
              'Poison Control: 1-800-222-1222'
            ]}
          />
        )}
      </Container>
    </MedicationErrorBoundary>
  );
};
