import React, { useState, useEffect } from 'react';
import {
  Box,
  FormControl,
  FormLabel,
  Select,
  VStack,
  HStack,
  Checkbox,
  Text,
  Alert,
  AlertIcon,
  AlertDescription,
  Tooltip,
  Radio,
  RadioGroup,
  Stack,
} from '@chakra-ui/react';
import { InfoIcon } from '@chakra-ui/icons';

interface FrequencyInputProps {
  value: string;
  onChange: (frequency: string, times: string[], isValid: boolean) => void;
  onTimeChange: (times: string[]) => void;
}

export const FrequencyInput: React.FC<FrequencyInputProps> = ({
  value,
  onChange,
  onTimeChange,
}) => {
  const [frequencyType, setFrequencyType] = useState<'fixed' | 'prn'>('fixed');
  const [timesPerDay, setTimesPerDay] = useState<number>(1);
  const [selectedTimes, setSelectedTimes] = useState<string[]>([]);
  const [isValid, setIsValid] = useState(true);
  const [validationMessage, setValidationMessage] = useState('');

  const timeOptions = {
    morning: '8:00 AM',
    noon: '12:00 PM',
    afternoon: '2:00 PM',
    evening: '6:00 PM',
    bedtime: '10:00 PM',
  };

  useEffect(() => {
    validateFrequency();
  }, [frequencyType, timesPerDay, selectedTimes]);

  const validateFrequency = () => {
    if (frequencyType === 'prn') {
      setIsValid(true);
      setValidationMessage('');
      onChange('PRN', [], true);
      return;
    }

    if (selectedTimes.length !== timesPerDay) {
      setIsValid(false);
      setValidationMessage(
        `Please select exactly ${timesPerDay} time${timesPerDay > 1 ? 's' : ''} of day`
      );
      onChange(`${timesPerDay} times per day`, selectedTimes, false);
      return;
    }

    setIsValid(true);
    setValidationMessage('');
    onChange(`${timesPerDay} times per day`, selectedTimes, true);
  };

  const handleTimeSelect = (time: string, isChecked: boolean) => {
    let newTimes: string[];
    if (isChecked) {
      newTimes = [...selectedTimes, time];
    } else {
      newTimes = selectedTimes.filter((t) => t !== time);
    }
    setSelectedTimes(newTimes);
    onTimeChange(newTimes);
  };

  return (
    <VStack spacing={4} align="stretch">
      <FormControl>
        <FormLabel>
          Frequency Type
          <Tooltip label="Choose between fixed schedule or as-needed (PRN) medication">
            <InfoIcon ml={2} />
          </Tooltip>
        </FormLabel>
        <RadioGroup value={frequencyType} onChange={(value: 'fixed' | 'prn') => setFrequencyType(value)}>
          <Stack direction="row">
            <Radio value="fixed">Fixed Schedule</Radio>
            <Radio value="prn">As Needed (PRN)</Radio>
          </Stack>
        </RadioGroup>
      </FormControl>

      {frequencyType === 'fixed' && (
        <>
          <FormControl>
            <FormLabel>Times Per Day</FormLabel>
            <Select
              value={timesPerDay}
              onChange={(e) => setTimesPerDay(Number(e.target.value))}
            >
              {[1, 2, 3, 4, 6].map((num) => (
                <option key={num} value={num}>
                  {num} time{num > 1 ? 's' : ''} per day
                </option>
              ))}
            </Select>
          </FormControl>

          <FormControl isInvalid={!isValid}>
            <FormLabel>Select Times</FormLabel>
            <VStack align="start">
              {Object.entries(timeOptions).map(([key, defaultTime]) => (
                <Checkbox
                  key={key}
                  isChecked={selectedTimes.includes(key)}
                  onChange={(e) => handleTimeSelect(key, e.target.checked)}
                  isDisabled={
                    !selectedTimes.includes(key) &&
                    selectedTimes.length >= timesPerDay
                  }
                >
                  <HStack>
                    <Text textTransform="capitalize">{key}</Text>
                    <Text color="gray.500">({defaultTime})</Text>
                  </HStack>
                </Checkbox>
              ))}
            </VStack>
          </FormControl>

          {!isValid && (
            <Alert status="warning">
              <AlertIcon />
              <AlertDescription>{validationMessage}</AlertDescription>
            </Alert>
          )}
        </>
      )}

      {frequencyType === 'prn' && (
        <Box>
          <Text fontSize="sm" color="gray.600">
            Take this medication only when needed according to the prescribed
            instructions.
          </Text>
        </Box>
      )}
    </VStack>
  );
};
