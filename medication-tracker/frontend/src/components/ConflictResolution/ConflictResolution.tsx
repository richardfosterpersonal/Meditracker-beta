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
import { utcToLocal, localToUtc } from '../../utils/timezone';

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
      return 'purple';
    case 'meal_offset_adjustment':
      return 'orange';
    case 'meal_change':
      return 'green';
    default:
      return 'gray';
  }
};

const formatSuggestionType = (type: Suggestion['type']): string => {
  switch (type) {
    case 'time_shift':
      return 'Time Adjustment';
    case 'interval_adjustment':
      return 'Interval Change';
    case 'meal_offset_adjustment':
      return 'Meal Timing';
    case 'meal_change':
      return 'Meal Type';
    default:
      return type;
  }
};

const ConflictResolution: React.FC<ConflictResolutionProps> = ({
  isOpen,
  onClose,
  conflicts,
  onResolve,
  scheduleName,
  userTimezone
}) => {
  const toast = useToast();

  const handleResolve = (resolution: 'adjust' | 'override' | 'cancel', suggestion?: Suggestion) => {
    onResolve(resolution, suggestion);
    toast({
      title: 'Schedule Updated',
      description: 'The medication schedule has been updated successfully.',
      status: 'success',
      duration: 5000,
      isClosable: true,
    });
    onClose();
  };

  const formatTime = (time: string, fromTimezone?: string): string => {
    if (!time) return 'N/A';
    
    const utcDate = fromTimezone 
      ? localToUtc(new Date(time), fromTimezone)
      : new Date(time);
      
    const localDate = userTimezone
      ? utcToLocal(utcDate, userTimezone)
      : utcDate;

    return format(localDate, 'h:mm a');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          Schedule Conflicts Detected
          <Text fontSize="sm" color="gray.500" mt={1}>
            {scheduleName}
          </Text>
        </ModalHeader>
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <Box bg="orange.50" p={4} borderRadius="md">
              <HStack>
                <WarningIcon color="orange.500" />
                <Text>
                  We've detected potential conflicts in your medication schedule. Please review the suggestions below.
                </Text>
              </HStack>
            </Box>

            <Accordion allowMultiple>
              {conflicts.map((conflict, index) => (
                <AccordionItem key={index}>
                  <AccordionButton>
                    <Box flex="1" textAlign="left">
                      <HStack>
                        <Text fontWeight="bold">
                          {conflict.medication1} & {conflict.medication2}
                        </Text>
                        <Badge colorScheme="red">{conflict.type}</Badge>
                        <TimeIcon />
                        <Text fontSize="sm" color="gray.500">
                          {formatTime(conflict.time, conflict.timezone1)}
                        </Text>
                      </HStack>
                    </Box>
                    <AccordionIcon />
                  </AccordionButton>
                  <AccordionPanel pb={4}>
                    <VStack spacing={3} align="stretch">
                      {conflict.suggestions.map((suggestion, sIndex) => (
                        <Box
                          key={sIndex}
                          p={3}
                          borderWidth="1px"
                          borderRadius="md"
                          borderColor={`${getSuggestionColor(suggestion.type)}.200`}
                        >
                          <HStack spacing={3} mb={2}>
                            <Badge colorScheme={getSuggestionColor(suggestion.type)}>
                              {formatSuggestionType(suggestion.type)}
                            </Badge>
                            <Tooltip label={suggestion.reason}>
                              <InfoIcon color="gray.400" />
                            </Tooltip>
                          </HStack>
                          <Text mb={2}>{suggestion.description}</Text>
                          {suggestion.original_time && suggestion.suggested_time && (
                            <HStack fontSize="sm" color="gray.600">
                              <Text>Change from:</Text>
                              <Badge>{formatTime(suggestion.original_time.toString())}</Badge>
                              <Text>to:</Text>
                              <Badge colorScheme="green">
                                {formatTime(suggestion.suggested_time.toString())}
                              </Badge>
                            </HStack>
                          )}
                          <Button
                            size="sm"
                            colorScheme={getSuggestionColor(suggestion.type)}
                            variant="outline"
                            mt={2}
                            onClick={() => handleResolve('adjust', suggestion)}
                          >
                            Apply This Solution
                          </Button>
                        </Box>
                      ))}
                    </VStack>
                  </AccordionPanel>
                </AccordionItem>
              ))}
            </Accordion>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <HStack spacing={4}>
            <Button variant="ghost" onClick={() => handleResolve('cancel')}>
              Cancel Changes
            </Button>
            <Button colorScheme="red" onClick={() => handleResolve('override')}>
              Override Conflicts
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ConflictResolution;
