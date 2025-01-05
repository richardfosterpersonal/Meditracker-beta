import React, { useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Text,
  VStack,
  HStack,
  Badge,
  Divider,
  useTheme,
  WarningIcon,
  Checkbox,
  Box,
} from '@chakra-ui/react';

interface MedicationDetails {
  name: string;
  dosage: string;
  frequency: string;
  times: string[];
  isPRN: boolean;
  warnings?: string[];
  interactions?: Array<{
    interacting_drug: string;
    severity: string;
    description: string;
  }>;
  precautions?: string[];
}

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  medication: MedicationDetails;
  validationWarnings: string[];
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  medication,
  validationWarnings,
}) => {
  const theme = useTheme();
  const [hasAcknowledgedWarnings, setHasAcknowledgedWarnings] = useState(false);

  const formatTimes = (times: string[]) => {
    return times.map((time) => time.replace('_', ' ')).join(', ');
  };

  const hasSeriousWarnings = medication.warnings?.some(warning => 
    warning.toLowerCase().includes('serious') || 
    warning.toLowerCase().includes('severe') ||
    warning.toLowerCase().includes('fatal')
  );

  const hasHighRiskInteractions = medication.interactions?.some(interaction =>
    interaction.severity.toLowerCase().includes('high') ||
    interaction.severity.toLowerCase().includes('severe')
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Confirm Medication Details</ModalHeader>
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <Text fontWeight="bold" fontSize="lg">
              Please review the following details carefully:
            </Text>

            {/* Medication Details */}
            <VStack
              spacing={3}
              p={4}
              bg="gray.50"
              borderRadius="md"
              align="stretch"
            >
              <HStack justify="space-between">
                <Text fontWeight="semibold">Medication Name:</Text>
                <Text>{medication.name}</Text>
              </HStack>

              <HStack justify="space-between">
                <Text fontWeight="semibold">Dosage:</Text>
                <Text>{medication.dosage}</Text>
              </HStack>

              <HStack justify="space-between">
                <Text fontWeight="semibold">Frequency:</Text>
                <Text>
                  {medication.isPRN ? 'As needed (PRN)' : medication.frequency}
                </Text>
              </HStack>

              {!medication.isPRN && medication.times.length > 0 && (
                <HStack justify="space-between">
                  <Text fontWeight="semibold">Times:</Text>
                  <Text>{formatTimes(medication.times)}</Text>
                </HStack>
              )}
            </VStack>

            {/* Important Warnings */}
            {(medication.warnings?.length > 0 || medication.interactions?.length > 0) && (
              <VStack
                spacing={3}
                p={4}
                bg={hasSeriousWarnings ? "red.50" : "yellow.50"}
                borderRadius="md"
                align="stretch"
              >
                <HStack>
                  <WarningIcon color={hasSeriousWarnings ? "red.500" : "yellow.500"} />
                  <Text fontWeight="bold" color={hasSeriousWarnings ? "red.500" : "yellow.500"}>
                    Important Safety Information
                  </Text>
                </HStack>

                {medication.warnings?.map((warning, index) => (
                  <Text key={`warning-${index}`} color={hasSeriousWarnings ? "red.700" : "yellow.700"}>
                    • {warning}
                  </Text>
                ))}

                {medication.interactions?.map((interaction, index) => (
                  <Box key={`interaction-${index}`} p={2} bg="white" borderRadius="md">
                    <Text color={interaction.severity.toLowerCase().includes('high') ? "red.600" : "yellow.600"}>
                      <strong>Interaction with {interaction.interacting_drug}</strong>
                    </Text>
                    <Text>{interaction.description}</Text>
                  </Box>
                ))}

                <Checkbox
                  isChecked={hasAcknowledgedWarnings}
                  onChange={(e) => setHasAcknowledgedWarnings(e.target.checked)}
                  colorScheme="red"
                >
                  I have read and understood the warnings
                </Checkbox>
              </VStack>
            )}

            {/* Validation Warnings */}
            {validationWarnings.length > 0 && (
              <VStack
                spacing={2}
                p={4}
                bg="orange.50"
                borderRadius="md"
                align="stretch"
              >
                <HStack>
                  <WarningIcon color="orange.500" />
                  <Text fontWeight="bold" color="orange.700">
                    Schedule Validation Warnings
                  </Text>
                </HStack>

                {validationWarnings.map((warning, index) => (
                  <Text key={index} color="orange.700">
                    • {warning}
                  </Text>
                ))}
              </VStack>
            )}
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button
            colorScheme="blue"
            onClick={onConfirm}
            isDisabled={
              (hasSeriousWarnings || hasHighRiskInteractions) && 
              !hasAcknowledgedWarnings
            }
          >
            Confirm
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
