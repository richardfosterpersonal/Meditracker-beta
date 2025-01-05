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
  Box,
  Text,
  Badge,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  useToast,
  Divider,
  Icon,
  Tooltip
} from '@chakra-ui/react';
import { format } from 'date-fns';
import { InfoIcon, WarningIcon, TimeIcon } from '@chakra-ui/icons';
import { utcToLocal, localToUtc } from '../utils/timezone';

interface Suggestion {
  type: 'time_shift' | 'interval_adjustment' | 'meal_offset_adjustment' | 'meal_change';
  description: string;
  reason: string;
  original_time?: Date;
  suggested_time?: Date;
  original_interval?: number;
  suggested_interval?: number;
  original_offset?: number;
  suggested_offset?: number;
  original_meal?: string;
  suggested_meal?: string;
}

interface Conflict {
  medication1: string;
  medication2: string;
  time: string;
  type: string;
  suggestions: Suggestion[];
  timezone1?: string;  // Timezone for medication1's user
  timezone2?: string;  // Timezone for medication2's user
}

interface ConflictResolutionProps {
  isOpen: boolean;
  onClose: () => void;
  conflicts: Conflict[];
  onResolve: (resolution: 'adjust' | 'override' | 'cancel', selectedSuggestion?: Suggestion) => void;
  scheduleName: string;
  userTimezone: string;
}

const getSuggestionColor = (type: Suggestion['type']): string => {
  switch (type) {
    case 'time_shift':
      return 'blue';
    case 'interval_adjustment':
      return 'green';
    case 'meal_offset_adjustment':
      return 'orange';
    case 'meal_change':
      return 'purple';
    default:
      return 'gray';
  }
};

const formatSuggestionType = (type: Suggestion['type']): string => {
  switch (type) {
    case 'time_shift':
      return 'Time Shift';
    case 'interval_adjustment':
      return 'Interval';
    case 'meal_offset_adjustment':
      return 'Meal Offset';
    case 'meal_change':
      return 'Meal Change';
    default:
      return type;
  }
};

export const ConflictResolution: React.FC<ConflictResolutionProps> = ({
  isOpen,
  onClose,
  conflicts,
  onResolve,
  scheduleName,
  userTimezone
}) => {
  const toast = useToast();
  const [selectedSuggestion, setSelectedSuggestion] = React.useState<Suggestion | null>(null);

  const handleResolve = (resolution: 'adjust' | 'override' | 'cancel') => {
    if (resolution === 'override') {
      toast({
        title: 'Warning',
        description: 'Please consult with your healthcare provider before overriding medication conflicts.',
        status: 'warning',
        duration: 5000,
        isClosable: true
      });
    } else if (resolution === 'adjust' && !selectedSuggestion) {
      toast({
        title: 'Select Adjustment',
        description: 'Please select a suggested adjustment before proceeding.',
        status: 'info',
        duration: 3000,
        isClosable: true
      });
      return;
    }
    onResolve(resolution, selectedSuggestion || undefined);
    onClose();
  };

  const formatTime = (timeStr: string, timezone?: string) => {
    try {
      const date = new Date(timeStr);
      if (isNaN(date.getTime())) {
        throw new Error('Invalid date');
      }
      // Convert to user's timezone for display
      const localDate = timezone ? 
        utcToLocal(date, timezone) : 
        utcToLocal(date, userTimezone);
      return format(localDate, 'h:mm a z');
    } catch (error) {
      console.error('Error formatting time:', error);
      return 'Invalid Time';
    }
  };

  const renderTimezoneDifference = (conflict: Conflict) => {
    if (!conflict.timezone1 || !conflict.timezone2 || conflict.timezone1 === conflict.timezone2) {
      return null;
    }

    return (
      <Tooltip
        label={`${conflict.medication1} is scheduled in ${conflict.timezone1}, while ${conflict.medication2} is scheduled in ${conflict.timezone2}`}
      >
        <HStack spacing={1} color="orange.500">
          <Icon as={TimeIcon} />
          <Text fontSize="sm">Timezone Difference</Text>
        </HStack>
      </Tooltip>
    );
  };

  const renderSuggestion = (suggestion: Suggestion, index: number) => (
    <Box
      key={index}
      p={4}
      borderWidth={1}
      borderRadius="md"
      cursor="pointer"
      onClick={() => setSelectedSuggestion(suggestion)}
      bg={selectedSuggestion === suggestion ? 'blue.50' : 'white'}
      _hover={{ bg: 'gray.50' }}
    >
      <VStack align="stretch" spacing={2}>
        <HStack justify="space-between">
          <Badge colorScheme={getSuggestionColor(suggestion.type)}>
            {formatSuggestionType(suggestion.type)}
          </Badge>
          {suggestion.original_time && suggestion.suggested_time && (
            <Text fontSize="sm" color="gray.600">
              {formatTime(suggestion.original_time.toISOString())} → {formatTime(suggestion.suggested_time.toISOString())}
            </Text>
          )}
        </HStack>
        <Text>{suggestion.description}</Text>
        <Text fontSize="sm" color="gray.600">{suggestion.reason}</Text>
      </VStack>
    </Box>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          Schedule Conflicts Detected
          <Text fontSize="sm" color="gray.600" mt={1}>
            {scheduleName}
          </Text>
        </ModalHeader>
        <ModalBody>
          <VStack spacing={4} align="stretch">
            {conflicts.map((conflict, index) => (
              <Accordion key={index} allowToggle>
                <AccordionItem>
                  <AccordionButton>
                    <Box flex="1">
                      <HStack>
                        <Icon as={WarningIcon} color="red.500" />
                        <Text>
                          Scheduled at {formatTime(conflict.time, conflict.timezone1)}
                          {conflict.timezone2 && conflict.timezone1 !== conflict.timezone2 && (
                            <Text as="span" color="gray.600">
                              {' '}({formatTime(conflict.time, conflict.timezone2)} in {conflict.timezone2})
                            </Text>
                          )}
                        </Text>
                      </HStack>
                      <HStack mt={2}>
                        <Text color="gray.600">
                          {conflict.medication1} and {conflict.medication2}
                        </Text>
                        {renderTimezoneDifference(conflict)}
                      </HStack>
                    </Box>
                    <AccordionIcon />
                  </AccordionButton>
                  <AccordionPanel>
                    <VStack spacing={3} align="stretch">
                      <Text>Suggested Adjustments:</Text>
                      {conflict.suggestions.map((suggestion, idx) =>
                        renderSuggestion(suggestion, idx)
                      )}
                    </VStack>
                  </AccordionPanel>
                </AccordionItem>
              </Accordion>
            ))}
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={() => handleResolve('cancel')}>
            Cancel
          </Button>
          <Button colorScheme="red" mr={3} onClick={() => handleResolve('override')}>
            Override
          </Button>
          <Button
            colorScheme="blue"
            onClick={() => handleResolve('adjust')}
            isDisabled={!selectedSuggestion}
          >
            Adjust Schedule
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
