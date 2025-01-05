import React, { useState } from 'react';
import {
  Box,
  VStack,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Select,
  Alert,
  AlertIcon,
  AlertDescription,
  Button,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Text,
  Divider,
  Checkbox,
  HStack,
} from '@chakra-ui/react';
import { InfoIcon, WarningIcon } from '@chakra-ui/icons';
import { useValidation } from '../../hooks/useValidation';
import { useMetrics, withPerformanceTracking } from '../../hooks/useMetrics';
import { ValidationTypes } from '../../types/validation';

interface CustomMedicationFormProps {
  onSubmit: (customMedication: CustomMedicationType) => void;
  onCancel: () => void;
}

interface CustomMedicationType {
  form: string;
  customForm?: string;
  dosageValue: string;
  dosageUnit: string;
  customUnit?: string;
  route: string;
  customRoute?: string;
  instructions: string;
  prescribedBy?: string;
  verificationNotes?: string;
}

export const CustomMedicationForm: React.FC<CustomMedicationFormProps> = ({
  onSubmit,
  onCancel,
}) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { validateMedication, validationStatus } = useValidation();
  const { trackUsage, trackPerformance } = useMetrics();
  const [formData, setFormData] = useState<CustomMedicationType>({
    form: '',
    dosageValue: '',
    dosageUnit: '',
    route: '',
    instructions: '',
  });
  const [hasVerified, setHasVerified] = useState(false);

  // Basic routes of administration
  const commonRoutes = [
    'Oral',
    'Topical',
    'Injection',
    'Inhalation',
    'Other (specify)',
  ];

  // Basic units that might be needed
  const commonUnits = [
    'mg',
    'ml',
    'g',
    'mcg',
    'units',
    'drops',
    'applications',
    'Other (specify)',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const start = performance.now();

    try {
      // Track form submission attempt
      trackUsage({
        feature: 'medication_form',
        action: 'submit_attempt',
        metadata: {
          medicationName: formData.customForm,
          dosage: formData.dosageValue,
          frequency: formData.instructions,
        },
      });

      // Validate against critical path requirements
      const validationResult = await validateMedication({
        type: ValidationTypes.MEDICATION_SAFETY,
        data: formData,
        component: 'medication',
        feature: 'medication_management',
      });

      if (validationResult.status === 'success') {
        // Submit form
        await onSubmit(formData);

        // Track successful submission
        trackUsage({
          feature: 'medication_form',
          action: 'submit_success',
          metadata: {
            medicationName: formData.customForm,
            dosage: formData.dosageValue,
            frequency: formData.instructions,
          },
        });
      } else {
        // Track validation failed
        trackUsage({
          feature: 'medication_form',
          action: 'validation_failed',
          metadata: {
            errors: validationResult.errors,
          },
        });

        onOpen(); // Show validation error modal
      }

      // Track performance
      trackPerformance({
        component: 'CustomMedicationForm',
        action: 'submit',
        duration: performance.now() - start,
        metadata: {
          validationTime: validationResult.duration,
        },
      });
    } catch (error) {
      // Track error
      trackUsage({
        feature: 'medication_form',
        action: 'submit_error',
        metadata: {
          error: error.message,
        },
      });
    }
  };

  const handleConfirmedSubmit = () => {
    onSubmit(formData);
    onClose();
  };

  const handleInputChange = (
    field: keyof CustomMedicationType,
    value: string
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Box as="form" onSubmit={handleSubmit} p={4} borderWidth="1px" borderRadius="lg">
      <VStack spacing={4} align="stretch">
        {validationStatus.error && (
          <Alert status="error">
            <AlertIcon />
            <AlertDescription>{validationStatus.error}</AlertDescription>
          </Alert>
        )}

        <Alert status="info">
          <AlertIcon />
          <AlertDescription>
            Please provide detailed information about your medication. Be as
            specific as possible to ensure accurate tracking.
          </AlertDescription>
        </Alert>

        <FormControl isRequired>
          <FormLabel>Medication Form</FormLabel>
          <Input
            placeholder="e.g., Compounded cream, Special solution"
            value={formData.customForm || ''}
            onChange={(e) => handleInputChange('customForm', e.target.value)}
          />
        </FormControl>

        <HStack spacing={4}>
          <FormControl isRequired>
            <FormLabel>Dosage Value</FormLabel>
            <Input
              type="number"
              value={formData.dosageValue}
              onChange={(e) => handleInputChange('dosageValue', e.target.value)}
            />
          </FormControl>

          <FormControl isRequired>
            <FormLabel>Dosage Unit</FormLabel>
            <Select
              value={formData.dosageUnit}
              onChange={(e) => handleInputChange('dosageUnit', e.target.value)}
            >
              <option value="">Select unit</option>
              {commonUnits.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </Select>
          </FormControl>
        </HStack>

        {formData.dosageUnit === 'Other (specify)' && (
          <FormControl>
            <FormLabel>Custom Unit</FormLabel>
            <Input
              placeholder="Specify custom unit"
              value={formData.customUnit || ''}
              onChange={(e) => handleInputChange('customUnit', e.target.value)}
            />
          </FormControl>
        )}

        <FormControl isRequired>
          <FormLabel>Route of Administration</FormLabel>
          <Select
            value={formData.route}
            onChange={(e) => handleInputChange('route', e.target.value)}
          >
            <option value="">Select route</option>
            {commonRoutes.map((route) => (
              <option key={route} value={route}>
                {route}
              </option>
            ))}
          </Select>
        </FormControl>

        {formData.route === 'Other (specify)' && (
          <FormControl>
            <FormLabel>Custom Route</FormLabel>
            <Input
              placeholder="Specify custom route"
              value={formData.customRoute || ''}
              onChange={(e) => handleInputChange('customRoute', e.target.value)}
            />
          </FormControl>
        )}

        <FormControl isRequired>
          <FormLabel>Special Instructions</FormLabel>
          <Textarea
            placeholder="Enter any special instructions or notes about this medication"
            value={formData.instructions}
            onChange={(e) => handleInputChange('instructions', e.target.value)}
          />
        </FormControl>

        <FormControl>
          <FormLabel>Prescribed By</FormLabel>
          <Input
            placeholder="Name of healthcare provider (if applicable)"
            value={formData.prescribedBy || ''}
            onChange={(e) => handleInputChange('prescribedBy', e.target.value)}
          />
        </FormControl>

        <Alert status="warning">
          <AlertIcon />
          <AlertDescription>
            Please verify all information carefully. Custom medication entries
            require extra attention to ensure safety.
          </AlertDescription>
        </Alert>

        <Alert status="info">
          <AlertIcon />
          <AlertDescription>
            All medication entries are validated against our safety database and HIPAA requirements.
          </AlertDescription>
        </Alert>

        <Button colorScheme="blue" type="submit">
          Submit Custom Medication
        </Button>
      </VStack>

      {/* Verification Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Verify Custom Medication Details</ModalHeader>
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <Alert status="warning">
                <AlertIcon />
                <Box>
                  <Text fontWeight="bold">Important Safety Check</Text>
                  <Text>
                    You are adding a custom medication entry. Please verify all
                    details carefully.
                  </Text>
                </Box>
              </Alert>

              <Box p={4} borderWidth="1px" borderRadius="md">
                <VStack align="stretch" spacing={3}>
                  <Text>
                    <strong>Form:</strong> {formData.customForm}
                  </Text>
                  <Text>
                    <strong>Dosage:</strong> {formData.dosageValue}{' '}
                    {formData.customUnit || formData.dosageUnit}
                  </Text>
                  <Text>
                    <strong>Route:</strong>{' '}
                    {formData.customRoute || formData.route}
                  </Text>
                  <Text>
                    <strong>Instructions:</strong> {formData.instructions}
                  </Text>
                  {formData.prescribedBy && (
                    <Text>
                      <strong>Prescribed By:</strong> {formData.prescribedBy}
                    </Text>
                  )}
                </VStack>
              </Box>

              <FormControl>
                <FormLabel>Additional Verification Notes</FormLabel>
                <Textarea
                  placeholder="Add any additional notes about verification"
                  value={formData.verificationNotes || ''}
                  onChange={(e) =>
                    handleInputChange('verificationNotes', e.target.value)
                  }
                />
              </FormControl>

              <Checkbox
                isChecked={hasVerified}
                onChange={(e) => setHasVerified(e.target.checked)}
              >
                I have verified all the information above and confirm it is
                accurate
              </Checkbox>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Go Back
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleConfirmedSubmit}
              isDisabled={!hasVerified}
            >
              Confirm and Add
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default withPerformanceTracking(CustomMedicationForm, 'CustomMedicationForm');
