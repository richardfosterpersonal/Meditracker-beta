import React from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  VStack,
  HStack,
  Text,
  Badge,
  Progress,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Box,
  Divider,
  Icon,
  Tooltip,
  useTheme,
} from '@chakra-ui/react';
import { WarningIcon, InfoIcon, TimeIcon } from '@chakra-ui/icons';
import { FaExclamationTriangle, FaClock, FaInfoCircle } from 'react-icons/fa';
import { InteractionResult, SafetyAssessment } from '../../types/interactions';
import { Medication } from '../../types/medication';

interface InteractionWarningDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onProceed: () => void;
  onModify: () => void;
  interactions: InteractionResult[];
  medications: Medication[];
  safetyAssessment: SafetyAssessment;
}

export const InteractionWarningDialog: React.FC<InteractionWarningDialogProps> = ({
  isOpen,
  onClose,
  onProceed,
  onModify,
  interactions,
  medications,
  safetyAssessment,
}) => {
  const theme = useTheme();

  const getSeverityColor = (severity: string): string => {
    switch (severity.toLowerCase()) {
      case 'severe':
        return 'red.500';
      case 'high':
        return 'orange.500';
      case 'moderate':
        return 'yellow.500';
      case 'low':
        return 'green.500';
      default:
        return 'gray.500';
    }
  };

  const getSafetyScoreColor = (score: number): string => {
    if (score >= 0.8) return 'green.500';
    if (score >= 0.6) return 'yellow.500';
    if (score >= 0.4) return 'orange.500';
    return 'red.500';
  };

  const renderSafetyScore = () => (
    <Box mb={4} p={4} borderRadius="md" borderWidth={1}>
      <VStack align="stretch" spacing={2}>
        <HStack justify="space-between">
          <Text fontWeight="bold">Safety Score</Text>
          <Badge
            colorScheme={getSafetyScoreColor(safetyAssessment.score).split('.')[0]}
            fontSize="lg"
            px={3}
            py={1}
            borderRadius="full"
          >
            {Math.round(safetyAssessment.score * 100)}%
          </Badge>
        </HStack>
        <Progress
          value={safetyAssessment.score * 100}
          colorScheme={getSafetyScoreColor(safetyAssessment.score).split('.')[0]}
          size="sm"
          borderRadius="full"
        />
      </VStack>
    </Box>
  );

  const renderInteractionWarnings = () => (
    <VStack align="stretch" spacing={4}>
      {interactions.map((interaction, index) => (
        <Alert
          key={index}
          status={interaction.severity === 'severe' ? 'error' : 'warning'}
          variant="left-accent"
          borderRadius="md"
        >
          <Box flex="1">
            <AlertTitle display="flex" alignItems="center" gap={2}>
              <Icon
                as={interaction.severity === 'severe' ? FaExclamationTriangle : FaInfoCircle}
                color={getSeverityColor(interaction.severity)}
              />
              {interaction.type === 'timing' ? 'Timing Conflict' : 'Medication Interaction'}
            </AlertTitle>
            <AlertDescription>
              <VStack align="stretch" spacing={2} mt={2}>
                <Text>{interaction.description}</Text>
                <HStack wrap="wrap" spacing={2}>
                  {interaction.medications.map((med, idx) => (
                    <Badge key={idx} colorScheme="purple">
                      {med.name}
                    </Badge>
                  ))}
                </HStack>
                {interaction.warnings.map((warning, idx) => (
                  <Text key={idx} fontSize="sm" color="gray.600">
                    {warning.description}
                    {warning.source && (
                      <Text as="span" fontStyle="italic">
                        {' '}
                        (Source: {warning.source.name})
                      </Text>
                    )}
                  </Text>
                ))}
              </VStack>
            </AlertDescription>
          </Box>
        </Alert>
      ))}
    </VStack>
  );

  const renderRecommendations = () => (
    <Box mt={4}>
      <Text fontWeight="bold" mb={2}>
        Recommendations
      </Text>
      <VStack align="stretch" spacing={2}>
        {safetyAssessment.recommendations.map((rec, index) => (
          <HStack key={index} spacing={2}>
            <Icon as={FaInfoCircle} color="blue.500" />
            <Text>{rec}</Text>
          </HStack>
        ))}
      </VStack>
    </Box>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          <HStack spacing={2}>
            <WarningIcon color="orange.500" />
            <Text>Medication Interaction Warning</Text>
          </HStack>
        </ModalHeader>
        <ModalBody>
          <VStack align="stretch" spacing={4}>
            {renderSafetyScore()}
            <Divider />
            {renderInteractionWarnings()}
            <Divider />
            {renderRecommendations()}
          </VStack>
        </ModalBody>
        <ModalFooter>
          <HStack spacing={4}>
            {safetyAssessment.score >= 0.6 ? (
              <Button colorScheme="blue" onClick={onProceed}>
                Proceed
              </Button>
            ) : (
              <Tooltip label="Safety score too low to proceed">
                <Button isDisabled colorScheme="blue">
                  Proceed
                </Button>
              </Tooltip>
            )}
            <Button colorScheme="orange" onClick={onModify}>
              Modify Schedule
            </Button>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
