import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Progress,
  Badge,
  Icon,
  Tooltip,
  List,
  ListItem,
  ListIcon,
  Collapse,
  Button,
  useDisclosure,
} from '@chakra-ui/react';
import {
  FaCheckCircle,
  FaExclamationCircle,
  FaExclamationTriangle,
  FaInfoCircle,
  FaChevronDown,
  FaChevronUp,
} from 'react-icons/fa';
import { SafetyAssessment } from '../../types/interactions';

interface SafetyScoreDisplayProps {
  assessment: SafetyAssessment;
  showDetails?: boolean;
  compact?: boolean;
}

export const SafetyScoreDisplay: React.FC<SafetyScoreDisplayProps> = ({
  assessment,
  showDetails = true,
  compact = false,
}) => {
  const { isOpen, onToggle } = useDisclosure();

  const getScoreColor = (score: number): string => {
    if (score >= 0.8) return 'green';
    if (score >= 0.6) return 'yellow';
    if (score >= 0.4) return 'orange';
    return 'red';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 0.8) return FaCheckCircle;
    if (score >= 0.6) return FaInfoCircle;
    if (score >= 0.4) return FaExclamationCircle;
    return FaExclamationTriangle;
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 0.8) return 'Safe';
    if (score >= 0.6) return 'Use with Caution';
    if (score >= 0.4) return 'High Risk';
    return 'Unsafe';
  };

  const renderCompactView = () => (
    <HStack spacing={2}>
      <Icon
        as={getScoreIcon(assessment.score)}
        color={`${getScoreColor(assessment.score)}.500`}
      />
      <Badge colorScheme={getScoreColor(assessment.score)}>
        {Math.round(assessment.score * 100)}%
      </Badge>
    </HStack>
  );

  const renderFullView = () => (
    <VStack align="stretch" spacing={4} w="100%">
      <Box borderRadius="lg" borderWidth={1} p={4}>
        <VStack align="stretch" spacing={3}>
          <HStack justify="space-between">
            <Text fontSize="lg" fontWeight="bold">
              Safety Score
            </Text>
            <HStack spacing={2}>
              <Badge
                colorScheme={getScoreColor(assessment.score)}
                fontSize="md"
                px={3}
                py={1}
                borderRadius="full"
              >
                {Math.round(assessment.score * 100)}%
              </Badge>
              <Tooltip label={getScoreLabel(assessment.score)}>
                <Box>
                  <Icon
                    as={getScoreIcon(assessment.score)}
                    color={`${getScoreColor(assessment.score)}.500`}
                    boxSize={5}
                  />
                </Box>
              </Tooltip>
            </HStack>
          </HStack>

          <Progress
            value={assessment.score * 100}
            colorScheme={getScoreColor(assessment.score)}
            size="lg"
            borderRadius="full"
          />

          {showDetails && (
            <>
              <Button
                variant="ghost"
                size="sm"
                rightIcon={<Icon as={isOpen ? FaChevronUp : FaChevronDown} />}
                onClick={onToggle}
              >
                {isOpen ? 'Hide Details' : 'Show Details'}
              </Button>

              <Collapse in={isOpen}>
                <VStack align="stretch" spacing={3}>
                  {assessment.issues.length > 0 && (
                    <Box>
                      <Text fontWeight="semibold" mb={2}>
                        Safety Issues
                      </Text>
                      <List spacing={2}>
                        {assessment.issues.map((issue, index) => (
                          <ListItem key={index}>
                            <ListIcon
                              as={FaExclamationCircle}
                              color="orange.500"
                            />
                            {issue}
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  )}

                  {assessment.recommendations.length > 0 && (
                    <Box>
                      <Text fontWeight="semibold" mb={2}>
                        Recommendations
                      </Text>
                      <List spacing={2}>
                        {assessment.recommendations.map((rec, index) => (
                          <ListItem key={index}>
                            <ListIcon as={FaInfoCircle} color="blue.500" />
                            {rec}
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  )}

                  {assessment.alternativesAvailable && (
                    <Badge colorScheme="purple">
                      Safer alternatives available
                    </Badge>
                  )}

                  {assessment.requiresAttention && (
                    <Badge colorScheme="red">
                      Requires immediate attention
                    </Badge>
                  )}
                </VStack>
              </Collapse>
            </>
          )}
        </VStack>
      </Box>
    </VStack>
  );

  return compact ? renderCompactView() : renderFullView();
};
