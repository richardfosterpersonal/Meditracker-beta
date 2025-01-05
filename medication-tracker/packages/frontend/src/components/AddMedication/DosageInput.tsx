import React, { useState, useEffect } from 'react';
import {
  Box,
  FormControl,
  FormLabel,
  Input,
  Select,
  Text,
  VStack,
  HStack,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Button,
  useToast,
  Tooltip,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
} from '@chakra-ui/react';
import { InfoIcon } from '@chakra-ui/icons';

interface DosageInputProps {
  value: string;
  onChange: (value: string, isValid: boolean) => void;
  medicationType: string;
  onSuggestedDosage?: (dosage: string) => void;
}

export const DosageInput: React.FC<DosageInputProps> = ({
  value,
  onChange,
  medicationType,
  onSuggestedDosage,
}) => {
  const [dosageValue, setDosageValue] = useState<string>('');
  const [dosageUnit, setDosageUnit] = useState<string>('');
  const [validationMessage, setValidationMessage] = useState<string>('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isValid, setIsValid] = useState<boolean>(true);
  const toast = useToast();

  // Common dosage units based on medication type
  const getCommonUnits = () => {
    switch (medicationType.toLowerCase()) {
      case 'tablet':
      case 'capsule':
        return ['mg', 'tablet(s)', 'capsule(s)'];
      case 'liquid':
      case 'syrup':
        return ['ml', 'teaspoon', 'tablespoon'];
      case 'inhaler':
        return ['puff(s)'];
      case 'injection':
        return ['ml', 'mg'];
      case 'cream':
      case 'ointment':
        return ['application(s)', 'g'];
      case 'patch':
        return ['patch(es)'];
      default:
        return ['mg', 'ml', 'tablet(s)', 'capsule(s)'];
    }
  };

  // Common dosage values based on unit
  const getCommonValues = (unit: string) => {
    switch (unit) {
      case 'mg':
        return [1, 2, 5, 10, 20, 25, 50, 100, 200, 500];
      case 'ml':
        return [1, 2, 5, 10, 15, 20, 25];
      case 'tablet(s)':
      case 'capsule(s)':
      case 'puff(s)':
        return [1, 2, 3, 4];
      case 'application(s)':
        return [1, 2, 3];
      default:
        return [1, 2, 3, 4, 5];
    }
  };

  useEffect(() => {
    validateDosage();
  }, [dosageValue, dosageUnit]);

  const validateDosage = async () => {
    if (!dosageValue || !dosageUnit) {
      setIsValid(false);
      setValidationMessage('Please enter both value and unit');
      return;
    }

    try {
      const response = await fetch('/api/validate-dosage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          medicationType,
          dosageValue,
          dosageUnit,
        }),
      });

      const data = await response.json();
      
      setIsValid(data.isValid);
      setValidationMessage(data.message);
      setSuggestions(data.suggestions || []);

      if (!data.isValid) {
        toast({
          title: 'Dosage Warning',
          description: data.message,
          status: 'warning',
          duration: 5000,
          isClosable: true,
        });
      }

      onChange(`${dosageValue} ${dosageUnit}`, data.isValid);
    } catch (error) {
      console.error('Error validating dosage:', error);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    const [value, unit] = suggestion.split(' ');
    setDosageValue(value);
    setDosageUnit(unit);
    if (onSuggestedDosage) {
      onSuggestedDosage(suggestion);
    }
  };

  return (
    <VStack spacing={4} align="stretch">
      <FormControl isInvalid={!isValid}>
        <FormLabel>
          Dosage
          <Tooltip label="Enter the amount of medication to take each time">
            <InfoIcon ml={2} />
          </Tooltip>
        </FormLabel>
        <HStack>
          <NumberInput
            value={dosageValue}
            onChange={(value) => setDosageValue(value)}
            min={0}
            max={1000}
            step={0.1}
            w="150px"
          >
            <NumberInputField />
            <NumberInputStepper>
              <NumberIncrementStepper />
              <NumberDecrementStepper />
            </NumberInputStepper>
          </NumberInput>
          <Select
            value={dosageUnit}
            onChange={(e) => setDosageUnit(e.target.value)}
            placeholder="Select unit"
            w="150px"
          >
            {getCommonUnits().map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </Select>
        </HStack>

        {!isValid && (
          <Alert status="warning" mt={2}>
            <AlertIcon />
            <Box>
              <AlertTitle>Warning</AlertTitle>
              <AlertDescription>{validationMessage}</AlertDescription>
            </Box>
          </Alert>
        )}

        {suggestions.length > 0 && (
          <Box mt={4}>
            <Text fontWeight="bold">Suggested dosages:</Text>
            <HStack spacing={2} mt={2} flexWrap="wrap">
              {suggestions.map((suggestion, index) => (
                <Button
                  key={index}
                  size="sm"
                  variant="outline"
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  {suggestion}
                </Button>
              ))}
            </HStack>
          </Box>
        )}
      </FormControl>
    </VStack>
  );
};
