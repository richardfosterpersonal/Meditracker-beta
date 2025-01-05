import React, { useState, useCallback } from 'react';
import {
  Box,
  Select,
  FormControl,
  FormLabel,
  Stack,
  Input,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Button,
  VStack,
  HStack,
  Text,
  useToast
} from '@chakra-ui/react';
import { ConflictResolution } from './ConflictResolution';
import { ScheduleType, ScheduleConfig } from '../types/schedule';

interface TimeSlot {
  time: string;
  dose: number;
}

interface CyclicSchedule {
  daysOn: number;
  daysOff: number;
  dose: number;
}

interface TaperedSchedule {
  startDose: number;
  endDose: number;
  days: number;
  steps: number;
}

interface MealBasedSchedule {
  relation: 'before' | 'after' | 'with';
  meal: 'breakfast' | 'lunch' | 'dinner';
  timeOffset: number;
  dose: number;
}

interface SlidingScaleRule {
  measurement: number;
  dose: number;
}

interface ScheduleBuilderProps {
  onScheduleChange: (schedule: ScheduleConfig) => void;
  initialSchedule?: ScheduleConfig;
  medicationName: string;
}

export const ScheduleBuilder: React.FC<ScheduleBuilderProps> = ({
  onScheduleChange,
  initialSchedule,
  medicationName
}) => {
  const [scheduleType, setScheduleType] = useState<ScheduleType>(
    initialSchedule?.type || ScheduleType.FIXED_TIME
  );
  const [schedule, setSchedule] = useState<ScheduleConfig>(
    initialSchedule || { type: ScheduleType.FIXED_TIME, fixedTimeSlots: [] }
  );
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
  const toast = useToast();

  const handleScheduleTypeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = event.target.value as ScheduleType;
    setScheduleType(newType);
    const newSchedule: ScheduleConfig = { type: newType };
    handleScheduleChange(newSchedule);
  };

  const handleFixedTimeSchedule = (slots: TimeSlot[]) => {
    const newSchedule = { ...schedule, fixedTimeSlots: slots };
    handleScheduleChange(newSchedule);
  };

  const handleIntervalSchedule = (hours: number, dose: number) => {
    const newSchedule = { ...schedule, interval: { hours, dose } };
    handleScheduleChange(newSchedule);
  };

  const handlePRNSchedule = (maxDaily: number, minHours: number, dose: number) => {
    const newSchedule = {
      ...schedule,
      prn: { maxDailyDose: maxDaily, minHoursBetween: minHours, dose }
    };
    handleScheduleChange(newSchedule);
  };

  const handleCyclicSchedule = (daysOn: number, daysOff: number, dose: number) => {
    const newSchedule = {
      ...schedule,
      cyclic: { daysOn, daysOff, dose }
    };
    handleScheduleChange(newSchedule);
  };

  const handleTaperedSchedule = (
    startDose: number,
    endDose: number,
    days: number,
    steps: number
  ) => {
    const newSchedule = {
      ...schedule,
      tapered: { startDose, endDose, days, steps }
    };
    handleScheduleChange(newSchedule);
  };

  const handleMealBasedSchedule = (
    relation: 'before' | 'after' | 'with',
    meal: 'breakfast' | 'lunch' | 'dinner',
    timeOffset: number,
    dose: number
  ) => {
    const newSchedule = {
      ...schedule,
      mealBased: { relation, meal, timeOffset, dose }
    };
    handleScheduleChange(newSchedule);
  };

  const handleSlidingScaleSchedule = (
    measurementType: string,
    rules: SlidingScaleRule[]
  ) => {
    const newSchedule = {
      ...schedule,
      slidingScale: { measurementType, rules }
    };
    handleScheduleChange(newSchedule);
  };

  const handleScheduleChange = useCallback(async (newSchedule: ScheduleConfig) => {
    try {
      // Call backend to check for conflicts
      const response = await fetch('/api/schedule/check-conflicts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSchedule),
      });

      const data = await response.json();

      if (data.conflicts && data.conflicts.length > 0) {
        setConflicts(data.conflicts);
        setIsConflictModalOpen(true);
      } else {
        // No conflicts, proceed with update
        setSchedule(newSchedule);
        onScheduleChange(newSchedule);
      }
    } catch (error) {
      console.error('Error checking conflicts:', error);
      toast({
        title: 'Error',
        description: 'Failed to check schedule conflicts',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  }, [onScheduleChange, toast]);

  const handleConflictResolution = (resolution: 'adjust' | 'override' | 'cancel') => {
    if (resolution === 'override') {
      setSchedule(schedule);
      onScheduleChange(schedule);
    } else if (resolution === 'adjust') {
      // Reset to previous valid schedule
      setSchedule(initialSchedule || { type: ScheduleType.FIXED_TIME, fixedTimeSlots: [] });
    }
    // 'cancel' just closes the modal
    setIsConflictModalOpen(false);
  };

  const renderScheduleTypeFields = () => {
    switch (scheduleType) {
      case ScheduleType.FIXED_TIME:
        return <FixedTimeScheduleFields
          slots={schedule.fixedTimeSlots || []}
          onChange={handleFixedTimeSchedule}
        />;
      case ScheduleType.INTERVAL:
        return <IntervalScheduleFields
          interval={schedule.interval}
          onChange={handleIntervalSchedule}
        />;
      case ScheduleType.PRN:
        return <PRNScheduleFields
          prn={schedule.prn}
          onChange={handlePRNSchedule}
        />;
      case ScheduleType.CYCLIC:
        return <CyclicScheduleFields
          cyclic={schedule.cyclic}
          onChange={handleCyclicSchedule}
        />;
      case ScheduleType.TAPERED:
        return <TaperedScheduleFields
          tapered={schedule.tapered}
          onChange={handleTaperedSchedule}
        />;
      case ScheduleType.MEAL_BASED:
        return <MealBasedScheduleFields
          mealBased={schedule.mealBased}
          onChange={handleMealBasedSchedule}
        />;
      case ScheduleType.SLIDING_SCALE:
        return <SlidingScaleFields
          slidingScale={schedule.slidingScale}
          onChange={handleSlidingScaleSchedule}
        />;
      default:
        return null;
    }
  };

  return (
    <Box p={4}>
      <FormControl>
        <FormLabel>Schedule Type</FormLabel>
        <Select value={scheduleType} onChange={handleScheduleTypeChange}>
          <option value={ScheduleType.FIXED_TIME}>Fixed Time</option>
          <option value={ScheduleType.INTERVAL}>Interval</option>
          <option value={ScheduleType.PRN}>As Needed (PRN)</option>
          <option value={ScheduleType.CYCLIC}>Cyclic</option>
          <option value={ScheduleType.TAPERED}>Tapered</option>
          <option value={ScheduleType.MEAL_BASED}>Meal Based</option>
          <option value={ScheduleType.SLIDING_SCALE}>Sliding Scale</option>
        </Select>
      </FormControl>
      {renderScheduleTypeFields()}

      <ConflictResolution
        isOpen={isConflictModalOpen}
        onClose={() => setIsConflictModalOpen(false)}
        conflicts={conflicts}
        onResolve={handleConflictResolution}
        scheduleName={medicationName || 'New Schedule'}
      />
    </Box>
  );
};

// Sub-components for different schedule types
const FixedTimeScheduleFields: React.FC<{
  slots: TimeSlot[];
  onChange: (slots: TimeSlot[]) => void;
}> = ({ slots, onChange }) => {
  const addTimeSlot = () => {
    onChange([...slots, { time: '', dose: 0 }]);
  };

  const updateSlot = (index: number, field: keyof TimeSlot, value: string | number) => {
    const newSlots = [...slots];
    newSlots[index] = { ...newSlots[index], [field]: value };
    onChange(newSlots);
  };

  const removeSlot = (index: number) => {
    onChange(slots.filter((_, i) => i !== index));
  };

  return (
    <VStack spacing={4} mt={4}>
      {slots.map((slot, index) => (
        <HStack key={index} spacing={4}>
          <Input
            type="time"
            value={slot.time}
            onChange={(e) => updateSlot(index, 'time', e.target.value)}
          />
          <NumberInput
            value={slot.dose}
            onChange={(_, value) => updateSlot(index, 'dose', value)}
          >
            <NumberInputField />
            <NumberInputStepper>
              <NumberIncrementStepper />
              <NumberDecrementStepper />
            </NumberInputStepper>
          </NumberInput>
          <Button onClick={() => removeSlot(index)}>Remove</Button>
        </HStack>
      ))}
      <Button onClick={addTimeSlot}>Add Time Slot</Button>
    </VStack>
  );
};

const IntervalScheduleFields: React.FC<{
  interval?: { hours: number; dose: number };
  onChange: (hours: number, dose: number) => void;
}> = ({ interval, onChange }) => {
  return (
    <VStack spacing={4} mt={4}>
      <FormControl>
        <FormLabel>Hours Between Doses</FormLabel>
        <NumberInput
          value={interval?.hours || 0}
          onChange={(_, value) => onChange(value, interval?.dose || 0)}
        >
          <NumberInputField />
          <NumberInputStepper>
            <NumberIncrementStepper />
            <NumberDecrementStepper />
          </NumberInputStepper>
        </NumberInput>
      </FormControl>
      <FormControl>
        <FormLabel>Dose Amount</FormLabel>
        <NumberInput
          value={interval?.dose || 0}
          onChange={(_, value) => onChange(interval?.hours || 0, value)}
        >
          <NumberInputField />
          <NumberInputStepper>
            <NumberIncrementStepper />
            <NumberDecrementStepper />
          </NumberInputStepper>
        </NumberInput>
      </FormControl>
    </VStack>
  );
};

const PRNScheduleFields: React.FC<{
  prn?: { maxDailyDose: number; minHoursBetween: number; dose: number };
  onChange: (maxDaily: number, minHours: number, dose: number) => void;
}> = ({ prn, onChange }) => {
  return (
    <VStack spacing={4} mt={4}>
      <FormControl>
        <FormLabel>Maximum Daily Doses</FormLabel>
        <NumberInput
          value={prn?.maxDailyDose || 0}
          onChange={(_, value) => onChange(value, prn?.minHoursBetween || 0, prn?.dose || 0)}
        >
          <NumberInputField />
          <NumberInputStepper>
            <NumberIncrementStepper />
            <NumberDecrementStepper />
          </NumberInputStepper>
        </NumberInput>
      </FormControl>
      <FormControl>
        <FormLabel>Minimum Hours Between Doses</FormLabel>
        <NumberInput
          value={prn?.minHoursBetween || 0}
          onChange={(_, value) => onChange(prn?.maxDailyDose || 0, value, prn?.dose || 0)}
        >
          <NumberInputField />
          <NumberInputStepper>
            <NumberIncrementStepper />
            <NumberDecrementStepper />
          </NumberInputStepper>
        </NumberInput>
      </FormControl>
      <FormControl>
        <FormLabel>Dose Amount</FormLabel>
        <NumberInput
          value={prn?.dose || 0}
          onChange={(_, value) => onChange(prn?.maxDailyDose || 0, prn?.minHoursBetween || 0, value)}
        >
          <NumberInputField />
          <NumberInputStepper>
            <NumberIncrementStepper />
            <NumberDecrementStepper />
          </NumberInputStepper>
        </NumberInput>
      </FormControl>
    </VStack>
  );
};

const CyclicScheduleFields: React.FC<{
  cyclic?: { daysOn: number; daysOff: number; dose: number };
  onChange: (daysOn: number, daysOff: number, dose: number) => void;
}> = ({ cyclic, onChange }) => {
  return (
    <VStack spacing={4} mt={4}>
      <FormControl>
        <FormLabel>Days On</FormLabel>
        <NumberInput
          value={cyclic?.daysOn || 0}
          onChange={(_, value) => onChange(value, cyclic?.daysOff || 0, cyclic?.dose || 0)}
        >
          <NumberInputField />
          <NumberInputStepper>
            <NumberIncrementStepper />
            <NumberDecrementStepper />
          </NumberInputStepper>
        </NumberInput>
      </FormControl>
      <FormControl>
        <FormLabel>Days Off</FormLabel>
        <NumberInput
          value={cyclic?.daysOff || 0}
          onChange={(_, value) => onChange(cyclic?.daysOn || 0, value, cyclic?.dose || 0)}
        >
          <NumberInputField />
          <NumberInputStepper>
            <NumberIncrementStepper />
            <NumberDecrementStepper />
          </NumberInputStepper>
        </NumberInput>
      </FormControl>
      <FormControl>
        <FormLabel>Dose Amount</FormLabel>
        <NumberInput
          value={cyclic?.dose || 0}
          onChange={(_, value) => onChange(cyclic?.daysOn || 0, cyclic?.daysOff || 0, value)}
        >
          <NumberInputField />
          <NumberInputStepper>
            <NumberIncrementStepper />
            <NumberDecrementStepper />
          </NumberInputStepper>
        </NumberInput>
      </FormControl>
    </VStack>
  );
};

const TaperedScheduleFields: React.FC<{
  tapered?: { startDose: number; endDose: number; days: number; steps: number };
  onChange: (startDose: number, endDose: number, days: number, steps: number) => void;
}> = ({ tapered, onChange }) => {
  return (
    <VStack spacing={4} mt={4}>
      <FormControl>
        <FormLabel>Starting Dose</FormLabel>
        <NumberInput
          value={tapered?.startDose || 0}
          onChange={(_, value) => onChange(value, tapered?.endDose || 0, tapered?.days || 0, tapered?.steps || 0)}
        >
          <NumberInputField />
          <NumberInputStepper>
            <NumberIncrementStepper />
            <NumberDecrementStepper />
          </NumberInputStepper>
        </NumberInput>
      </FormControl>
      <FormControl>
        <FormLabel>Ending Dose</FormLabel>
        <NumberInput
          value={tapered?.endDose || 0}
          onChange={(_, value) => onChange(tapered?.startDose || 0, value, tapered?.days || 0, tapered?.steps || 0)}
        >
          <NumberInputField />
          <NumberInputStepper>
            <NumberIncrementStepper />
            <NumberDecrementStepper />
          </NumberInputStepper>
        </NumberInput>
      </FormControl>
      <FormControl>
        <FormLabel>Total Days</FormLabel>
        <NumberInput
          value={tapered?.days || 0}
          onChange={(_, value) => onChange(tapered?.startDose || 0, tapered?.endDose || 0, value, tapered?.steps || 0)}
        >
          <NumberInputField />
          <NumberInputStepper>
            <NumberIncrementStepper />
            <NumberDecrementStepper />
          </NumberInputStepper>
        </NumberInput>
      </FormControl>
      <FormControl>
        <FormLabel>Number of Steps</FormLabel>
        <NumberInput
          value={tapered?.steps || 0}
          onChange={(_, value) => onChange(tapered?.startDose || 0, tapered?.endDose || 0, tapered?.days || 0, value)}
        >
          <NumberInputField />
          <NumberInputStepper>
            <NumberIncrementStepper />
            <NumberDecrementStepper />
          </NumberInputStepper>
        </NumberInput>
      </FormControl>
    </VStack>
  );
};

const MealBasedScheduleFields: React.FC<{
  mealBased?: { relation: 'before' | 'after' | 'with'; meal: 'breakfast' | 'lunch' | 'dinner'; timeOffset: number; dose: number };
  onChange: (relation: 'before' | 'after' | 'with', meal: 'breakfast' | 'lunch' | 'dinner', timeOffset: number, dose: number) => void;
}> = ({ mealBased, onChange }) => {
  return (
    <VStack spacing={4} mt={4}>
      <FormControl>
        <FormLabel>Relation to Meal</FormLabel>
        <Select
          value={mealBased?.relation || 'before'}
          onChange={(e) => onChange(
            e.target.value as 'before' | 'after' | 'with',
            mealBased?.meal || 'breakfast',
            mealBased?.timeOffset || 0,
            mealBased?.dose || 0
          )}
        >
          <option value="before">Before</option>
          <option value="after">After</option>
          <option value="with">With</option>
        </Select>
      </FormControl>
      <FormControl>
        <FormLabel>Meal</FormLabel>
        <Select
          value={mealBased?.meal || 'breakfast'}
          onChange={(e) => onChange(
            mealBased?.relation || 'before',
            e.target.value as 'breakfast' | 'lunch' | 'dinner',
            mealBased?.timeOffset || 0,
            mealBased?.dose || 0
          )}
        >
          <option value="breakfast">Breakfast</option>
          <option value="lunch">Lunch</option>
          <option value="dinner">Dinner</option>
        </Select>
      </FormControl>
      <FormControl>
        <FormLabel>Time Offset (minutes)</FormLabel>
        <NumberInput
          value={mealBased?.timeOffset || 0}
          onChange={(_, value) => onChange(
            mealBased?.relation || 'before',
            mealBased?.meal || 'breakfast',
            value,
            mealBased?.dose || 0
          )}
        >
          <NumberInputField />
          <NumberInputStepper>
            <NumberIncrementStepper />
            <NumberDecrementStepper />
          </NumberInputStepper>
        </NumberInput>
      </FormControl>
      <FormControl>
        <FormLabel>Dose Amount</FormLabel>
        <NumberInput
          value={mealBased?.dose || 0}
          onChange={(_, value) => onChange(
            mealBased?.relation || 'before',
            mealBased?.meal || 'breakfast',
            mealBased?.timeOffset || 0,
            value
          )}
        >
          <NumberInputField />
          <NumberInputStepper>
            <NumberIncrementStepper />
            <NumberDecrementStepper />
          </NumberInputStepper>
        </NumberInput>
      </FormControl>
    </VStack>
  );
};

const SlidingScaleFields: React.FC<{
  slidingScale?: { measurementType: string; rules: SlidingScaleRule[] };
  onChange: (measurementType: string, rules: SlidingScaleRule[]) => void;
}> = ({ slidingScale, onChange }) => {
  const addRule = () => {
    const newRules = [...(slidingScale?.rules || []), { measurement: 0, dose: 0 }];
    onChange(slidingScale?.measurementType || '', newRules);
  };

  const updateRule = (index: number, field: keyof SlidingScaleRule, value: number) => {
    const newRules = [...(slidingScale?.rules || [])];
    newRules[index] = { ...newRules[index], [field]: value };
    onChange(slidingScale?.measurementType || '', newRules);
  };

  const removeRule = (index: number) => {
    const newRules = (slidingScale?.rules || []).filter((_, i) => i !== index);
    onChange(slidingScale?.measurementType || '', newRules);
  };

  return (
    <VStack spacing={4} mt={4}>
      <FormControl>
        <FormLabel>Measurement Type</FormLabel>
        <Input
          value={slidingScale?.measurementType || ''}
          onChange={(e) => onChange(e.target.value, slidingScale?.rules || [])}
          placeholder="e.g., Blood Sugar"
        />
      </FormControl>
      <Text>Rules</Text>
      {(slidingScale?.rules || []).map((rule, index) => (
        <HStack key={index} spacing={4}>
          <FormControl>
            <FormLabel>If measurement is above</FormLabel>
            <NumberInput
              value={rule.measurement}
              onChange={(_, value) => updateRule(index, 'measurement', value)}
            >
              <NumberInputField />
              <NumberInputStepper>
                <NumberIncrementStepper />
                <NumberDecrementStepper />
              </NumberInputStepper>
            </NumberInput>
          </FormControl>
          <FormControl>
            <FormLabel>Take dose</FormLabel>
            <NumberInput
              value={rule.dose}
              onChange={(_, value) => updateRule(index, 'dose', value)}
            >
              <NumberInputField />
              <NumberInputStepper>
                <NumberIncrementStepper />
                <NumberDecrementStepper />
              </NumberInputStepper>
            </NumberInput>
          </FormControl>
          <Button onClick={() => removeRule(index)}>Remove</Button>
        </HStack>
      ))}
      <Button onClick={addRule}>Add Rule</Button>
    </VStack>
  );
};

export { ScheduleBuilder };
