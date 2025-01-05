import React from 'react';
import {
  Box,
  Text,
  Button,
  VStack,
  HStack,
  Badge,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Spinner,
  useToast,
} from '@chakra-ui/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Medication } from '../../types';
import { AddMedication } from '../AddMedication';
import { householdApi } from '../../api/household';
import { HIPAAComplianceService } from '../../services/security/HIPAAComplianceService';
import { EncryptionService } from '../../services/security/EncryptionService';

interface MemberMedicationsProps {
  memberId: string;
  timezone?: string;  // Member's timezone
}

export const MemberMedications: React.FC<MemberMedicationsProps> = ({ 
  memberId,
  timezone = Intl.DateTimeFormat().resolvedOptions().timeZone  // Default to user's timezone
}) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  const queryClient = useQueryClient();
  const hipaaCompliance = HIPAAComplianceService.getInstance();
  const encryptionService = EncryptionService.getInstance();

  const { data: medications, isLoading, error } = useQuery<Medication[]>({
    queryKey: ['medications', memberId],
    queryFn: async () => {
      const data = await householdApi.getMemberMedications(memberId);
      // Log PHI access
      await hipaaCompliance.logPHIAccess(
        localStorage.getItem('user_id') || 'unknown',
        'view_medications',
        `member/${memberId}/medications`
      );
      return data;
    },
    onError: (error) => {
      toast({
        title: 'Error loading medications',
        description: 'Please try again later',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  });

  // Sanitize medication data for display
  const sanitizedMedications = React.useMemo(() => {
    if (!medications) return [];
    return medications.map(med => ({
      ...med,
      notes: hipaaCompliance.sanitizeData(med.notes),
      prescribingDoctor: hipaaCompliance.sanitizeData(med.prescribingDoctor)
    }));
  }, [medications]);

  const formatScheduleTime = (time: string) => {
    const date = new Date(time);
    return date.toLocaleTimeString('en-US', { 
      timeZone: timezone,
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
      timeZoneName: 'short'
    });
  };

  const handleAddSuccess = () => {
    queryClient.invalidateQueries(['medications', memberId]);
    onClose();
    toast({
      title: 'Medication added',
      status: 'success',
      duration: 3000,
    });
  };

  if (error) {
    return (
      <Text color="red.500" fontSize="sm">
        Error loading medications
      </Text>
    );
  }

  return (
    <>
      <VStack align="stretch" spacing={2}>
        <HStack justify="space-between">
          <Button size="sm" colorScheme="blue" onClick={onOpen}>
            Manage Medications
          </Button>
          <Badge colorScheme="purple">
            {timezone}
          </Badge>
        </HStack>
        
        {isLoading ? (
          <Spinner size="sm" />
        ) : (
          sanitizedMedications?.map((med) => (
            <Box key={med.id} p={2} bg="gray.50" borderRadius="md">
              <HStack justify="space-between">
                <VStack align="start" spacing={0}>
                  <Text fontSize="sm">
                    {med.name} - {med.dosage}
                  </Text>
                  <Text fontSize="xs" color="gray.600">
                    {med.frequency}
                  </Text>
                </VStack>
                {med.scheduledTime && (
                  <Text fontSize="xs" color="blue.600">
                    {formatScheduleTime(med.scheduledTime)}
                  </Text>
                )}
              </HStack>
            </Box>
          ))
        )}
      </VStack>

      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            Manage Member Medications
            <Text fontSize="sm" color="gray.600">
              Times shown in {timezone}
            </Text>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <AddMedication 
              userId={memberId} 
              onSuccess={handleAddSuccess}
              timezone={timezone}
            />
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};
