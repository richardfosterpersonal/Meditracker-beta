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
  Text,
  Box,
  List,
  ListItem,
  ListIcon,
  Divider,
  Badge,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  useClipboard,
  Icon,
} from '@chakra-ui/react';
import {
  FaExclamationTriangle,
  FaPhone,
  FaCopy,
  FaCheck,
  FaList,
  FaClock,
  FaHospital,
} from 'react-icons/fa';
import { InteractionResult } from '../../types/interactions';
import { Medication } from '../../types/medication';

interface EmergencyInstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  interaction: InteractionResult;
  medications: Medication[];
  emergencyInstructions: string;
  emergencyContacts: string[];
}

export const EmergencyInstructionsModal: React.FC<EmergencyInstructionsModalProps> = ({
  isOpen,
  onClose,
  interaction,
  medications,
  emergencyInstructions,
  emergencyContacts,
}) => {
  const { hasCopied, onCopy } = useClipboard(emergencyInstructions);

  const renderEmergencyAlert = () => (
    <Alert
      status="error"
      variant="solid"
      borderRadius="md"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      textAlign="center"
      py={4}
    >
      <AlertIcon boxSize="40px" mr={0} />
      <AlertTitle mt={4} mb={1} fontSize="lg">
        Emergency Medical Situation
      </AlertTitle>
      <AlertDescription maxWidth="sm">
        This interaction requires immediate medical attention.
        Follow these instructions carefully.
      </AlertDescription>
    </Alert>
  );

  const renderMedicationList = () => (
    <Box>
      <Text fontWeight="bold" mb={2}>
        Affected Medications:
      </Text>
      <List spacing={2}>
        {medications.map((med, index) => (
          <ListItem key={index}>
            <HStack>
              <ListIcon as={FaList} color="red.500" />
              <Text>{med.name}</Text>
              {med.dosage && (
                <Badge colorScheme="purple">
                  {med.dosage.amount} {med.dosage.unit}
                </Badge>
              )}
            </HStack>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  const renderEmergencyContacts = () => (
    <Box>
      <Text fontWeight="bold" mb={2}>
        Emergency Contacts:
      </Text>
      <List spacing={2}>
        {emergencyContacts.map((contact, index) => (
          <ListItem key={index}>
            <HStack>
              <ListIcon as={FaPhone} color="green.500" />
              <Text>{contact}</Text>
            </HStack>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  const renderInstructions = () => (
    <Box>
      <Text fontWeight="bold" mb={2}>
        Emergency Instructions:
      </Text>
      <VStack align="stretch" spacing={4}>
        <Alert status="error" variant="left-accent">
          <AlertIcon />
          <Box>
            <AlertTitle>Stop These Medications Immediately</AlertTitle>
            <AlertDescription>
              Do not take any more doses until cleared by a healthcare provider.
            </AlertDescription>
          </Box>
        </Alert>

        <Box>
          <HStack spacing={2} mb={2}>
            <Icon as={FaClock} color="orange.500" />
            <Text fontWeight="semibold">Immediate Actions:</Text>
          </HStack>
          <List spacing={2} pl={6}>
            <ListItem>Contact emergency services or your healthcare provider</ListItem>
            <ListItem>Document when you last took each medication</ListItem>
            <ListItem>Keep medication containers for reference</ListItem>
            <ListItem>Monitor for symptoms listed below</ListItem>
          </List>
        </Box>

        <Box>
          <HStack spacing={2} mb={2}>
            <Icon as={FaHospital} color="red.500" />
            <Text fontWeight="semibold">Watch for These Symptoms:</Text>
          </HStack>
          <List spacing={2} pl={6}>
            {interaction.warnings.map((warning, index) => (
              <ListItem key={index}>{warning.description}</ListItem>
            ))}
          </List>
        </Box>
      </VStack>
    </Box>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          <HStack spacing={2}>
            <Icon as={FaExclamationTriangle} color="red.500" />
            <Text>Emergency Instructions</Text>
          </HStack>
        </ModalHeader>

        <ModalBody>
          <VStack align="stretch" spacing={6}>
            {renderEmergencyAlert()}
            <Divider />
            {renderMedicationList()}
            <Divider />
            {renderEmergencyContacts()}
            <Divider />
            {renderInstructions()}
          </VStack>
        </ModalBody>

        <ModalFooter>
          <HStack spacing={4}>
            <Button
              leftIcon={<Icon as={hasCopied ? FaCheck : FaCopy} />}
              colorScheme={hasCopied ? 'green' : 'blue'}
              onClick={onCopy}
            >
              {hasCopied ? 'Copied!' : 'Copy Instructions'}
            </Button>
            <Button colorScheme="red" onClick={onClose}>
              Close
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
