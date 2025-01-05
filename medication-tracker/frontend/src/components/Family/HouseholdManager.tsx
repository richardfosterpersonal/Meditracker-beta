import React from 'react';
import {
  Box,
  Button,
  Heading,
  Text,
  VStack,
  useToast,
  SimpleGrid,
  Spinner,
} from '@chakra-ui/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Household, FamilyMember } from '../../types';
import { withPerformanceTracking } from '../../utils/withPerformanceTracking';
import { AddFamilyMember } from './AddFamilyMember';
import { MemberMedications } from './MemberMedications';
import { householdApi } from '../../api/household';

const HouseholdManager: React.FC = () => {
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data: household, isLoading, error } = useQuery<Household>({
    queryKey: ['household'],
    queryFn: householdApi.getHousehold,
  });

  const addMemberMutation = useMutation({
    mutationFn: householdApi.addFamilyMember,
    onSuccess: () => {
      queryClient.invalidateQueries(['household']);
      toast({
        title: 'Family member added',
        status: 'success',
        duration: 3000,
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to add family member',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    },
  });

  if (error) {
    return (
      <Box p={4}>
        <Text color="red.500">Error loading household data: {error.message}</Text>
      </Box>
    );
  }

  if (isLoading) {
    return (
      <Box p={4} textAlign="center">
        <Spinner size="xl" />
        <Text mt={4}>Loading household data...</Text>
      </Box>
    );
  }

  return (
    <Box p={4}>
      <Heading size="lg" mb={6}>
        Household Management
      </Heading>

      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={8}>
        <VStack align="stretch" spacing={4}>
          <Heading size="md">Family Members</Heading>
          <AddFamilyMember onAdd={(member) => addMemberMutation.mutate(member)} />
          
          {household?.members?.map((member) => (
            <Box 
              key={member.id} 
              p={4} 
              borderWidth={1} 
              borderRadius="md"
              _hover={{ shadow: 'md' }}
            >
              <Text fontWeight="bold">{member.name}</Text>
              <Text fontSize="sm" color="gray.600">
                {member.relationship}
              </Text>
              <MemberMedications memberId={member.id} />
            </Box>
          ))}
        </VStack>

        <VStack align="stretch" spacing={4}>
          <Heading size="md">Household Overview</Heading>
          <Box p={4} borderWidth={1} borderRadius="md">
            <Text>Total Members: {household?.members?.length || 0}</Text>
            <Text>
              Active Medications:{' '}
              {household?.members?.reduce(
                (acc, member) => acc + member.medications.length,
                0
              ) || 0}
            </Text>
          </Box>
        </VStack>
      </SimpleGrid>
    </Box>
  );
};

export default withPerformanceTracking(HouseholdManager);
