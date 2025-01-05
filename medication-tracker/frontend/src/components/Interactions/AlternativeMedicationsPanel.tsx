import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Button,
  Icon,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Tooltip,
  Progress,
  useDisclosure,
  Collapse,
  List,
  ListItem,
  ListIcon,
} from '@chakra-ui/react';
import {
  FaExchangeAlt,
  FaCheckCircle,
  FaExclamationCircle,
  FaInfoCircle,
  FaChevronDown,
  FaChevronUp,
} from 'react-icons/fa';
import { Medication } from '../../types/medication';

interface AlternativeMedicationsProps {
  currentMedication: Medication;
  alternatives: Medication[];
  onSelectAlternative: (medication: Medication) => void;
}

export const AlternativeMedicationsPanel: React.FC<AlternativeMedicationsProps> = ({
  currentMedication,
  alternatives,
  onSelectAlternative,
}) => {
  const { isOpen, onToggle } = useDisclosure();

  const getSafetyScoreColor = (score: number): string => {
    if (score >= 0.8) return 'green';
    if (score >= 0.6) return 'yellow';
    if (score >= 0.4) return 'orange';
    return 'red';
  };

  const renderSafetyScore = (score: number) => (
    <HStack spacing={2}>
      <Progress
        value={score * 100}
        colorScheme={getSafetyScoreColor(score)}
        size="sm"
        width="100px"
        borderRadius="full"
      />
      <Text fontWeight="bold" color={`${getSafetyScoreColor(score)}.500`}>
        {Math.round(score * 100)}%
      </Text>
    </HStack>
  );

  const renderCurrentMedication = () => (
    <Box p={4} borderWidth={1} borderRadius="md" bg="gray.50">
      <VStack align="stretch" spacing={3}>
        <HStack justify="space-between">
          <Text fontSize="lg" fontWeight="bold">
            Current Medication
          </Text>
          <Badge colorScheme="blue">Current</Badge>
        </HStack>

        <HStack spacing={4}>
          <Text>{currentMedication.name}</Text>
          {currentMedication.dosage && (
            <Badge colorScheme="purple">
              {currentMedication.dosage.amount} {currentMedication.dosage.unit}
            </Badge>
          )}
        </HStack>

        {currentMedication.safetyScore && (
          <Box>
            <Text fontWeight="semibold" mb={1}>
              Safety Score:
            </Text>
            {renderSafetyScore(currentMedication.safetyScore)}
          </Box>
        )}
      </VStack>
    </Box>
  );

  const renderAlternativesTable = () => (
    <Table variant="simple">
      <Thead>
        <Tr>
          <Th>Alternative</Th>
          <Th>Safety Score</Th>
          <Th>Dosage</Th>
          <Th>Action</Th>
        </Tr>
      </Thead>
      <Tbody>
        {alternatives.map((med, index) => (
          <Tr key={index}>
            <Td>
              <HStack spacing={2}>
                <Text>{med.name}</Text>
                {med.safetyScore && med.safetyScore > (currentMedication.safetyScore || 0) && (
                  <Tooltip label="Safer alternative">
                    <span>
                      <Icon as={FaCheckCircle} color="green.500" />
                    </span>
                  </Tooltip>
                )}
              </HStack>
            </Td>
            <Td>{med.safetyScore && renderSafetyScore(med.safetyScore)}</Td>
            <Td>
              {med.dosage && (
                <Badge colorScheme="purple">
                  {med.dosage.amount} {med.dosage.unit}
                </Badge>
              )}
            </Td>
            <Td>
              <Button
                size="sm"
                colorScheme="blue"
                leftIcon={<Icon as={FaExchangeAlt} />}
                onClick={() => onSelectAlternative(med)}
              >
                Switch
              </Button>
            </Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );

  const renderDetailedComparison = () => (
    <Collapse in={isOpen}>
      <Box mt={4}>
        <VStack align="stretch" spacing={4}>
          {alternatives.map((med, index) => (
            <Box key={index} p={4} borderWidth={1} borderRadius="md">
              <VStack align="stretch" spacing={3}>
                <HStack justify="space-between">
                  <Text fontWeight="bold">{med.name}</Text>
                  {med.safetyScore && med.safetyScore > (currentMedication.safetyScore || 0) && (
                    <Badge colorScheme="green">Safer Alternative</Badge>
                  )}
                </HStack>

                {med.advantages && (
                  <Box>
                    <Text fontWeight="semibold" mb={1}>
                      Advantages:
                    </Text>
                    <List spacing={1}>
                      {med.advantages.map((adv, idx) => (
                        <ListItem key={idx}>
                          <ListIcon as={FaCheckCircle} color="green.500" />
                          {adv}
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}

                {med.considerations && (
                  <Box>
                    <Text fontWeight="semibold" mb={1}>
                      Considerations:
                    </Text>
                    <List spacing={1}>
                      {med.considerations.map((con, idx) => (
                        <ListItem key={idx}>
                          <ListIcon as={FaInfoCircle} color="blue.500" />
                          {con}
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}

                <Button
                  colorScheme="blue"
                  leftIcon={<Icon as={FaExchangeAlt} />}
                  onClick={() => onSelectAlternative(med)}
                >
                  Switch to {med.name}
                </Button>
              </VStack>
            </Box>
          ))}
        </VStack>
      </Box>
    </Collapse>
  );

  return (
    <VStack align="stretch" spacing={4}>
      <Text fontSize="xl" fontWeight="bold">
        Alternative Medications
      </Text>

      {renderCurrentMedication()}

      <Box overflowX="auto">{renderAlternativesTable()}</Box>

      <Button
        variant="ghost"
        rightIcon={<Icon as={isOpen ? FaChevronUp : FaChevronDown} />}
        onClick={onToggle}
      >
        {isOpen ? 'Hide Detailed Comparison' : 'Show Detailed Comparison'}
      </Button>

      {renderDetailedComparison()}

      <Box mt={4}>
        <Alert status="info" borderRadius="md">
          <AlertIcon />
          <Text fontSize="sm">
            Always consult with your healthcare provider before switching medications.
            These alternatives are suggestions based on safety analysis.
          </Text>
        </Alert>
      </Box>
    </VStack>
  );
};
