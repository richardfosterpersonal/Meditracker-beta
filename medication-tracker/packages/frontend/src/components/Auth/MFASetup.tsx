import React, { useState } from 'react';
import {
  Box,
  Button,
  Text,
  VStack,
  Image,
  Input,
  useToast,
  List,
  ListItem,
  ListIcon,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from '@chakra-ui/react';
import { MdCheckCircle } from 'react-icons/md';
import { useAuth } from '../../context/AuthContext';

export const MFASetup: React.FC = () => {
  const { setupMFA } = useAuth();
  const [qrCode, setQrCode] = useState<string>('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();

  const handleSetup = async () => {
    try {
      setIsLoading(true);
      const setup = await setupMFA();
      setQrCode(setup.qrCode);
      setBackupCodes(setup.backupCodes);
      onOpen();
    } catch (error) {
      toast({
        title: 'Setup Failed',
        description: error.message || 'Failed to set up MFA',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setQrCode('');
    setBackupCodes([]);
    onClose();
  };

  return (
    <>
      <Button
        colorScheme="blue"
        onClick={handleSetup}
        isLoading={isLoading}
        loadingText="Setting up..."
      >
        Set Up Two-Factor Authentication
      </Button>

      <Modal isOpen={isOpen} onClose={handleClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Two-Factor Authentication Setup</ModalHeader>
          <ModalBody>
            <VStack spacing={6} align="stretch">
              <Box>
                <Text mb={4}>
                  1. Scan this QR code with your authenticator app (Google Authenticator,
                  Authy, etc.)
                </Text>
                {qrCode && (
                  <Box textAlign="center">
                    <Image src={qrCode} alt="QR Code" mx="auto" />
                  </Box>
                )}
              </Box>

              <Box>
                <Text mb={4}>
                  2. Save these backup codes in a secure location. You'll need them if
                  you lose access to your authenticator app.
                </Text>
                <List spacing={2}>
                  {backupCodes.map((code, index) => (
                    <ListItem key={index}>
                      <ListIcon as={MdCheckCircle} color="green.500" />
                      {code}
                    </ListItem>
                  ))}
                </List>
              </Box>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={handleClose}>
              Done
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};
