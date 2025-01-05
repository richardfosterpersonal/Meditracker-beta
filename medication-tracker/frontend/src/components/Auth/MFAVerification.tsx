import React, { useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  VStack,
  Text,
  useToast,
  Link,
  HStack,
} from '@chakra-ui/react';
import { useAuth } from '../../context/AuthContext';

export const MFAVerification: React.FC = () => {
  const { verifyMFA, verifyBackupCode, error, clearError } = useAuth();
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [useBackupCode, setUseBackupCode] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setIsLoading(true);

    try {
      if (useBackupCode) {
        await verifyBackupCode(code);
      } else {
        await verifyMFA(code);
      }
    } catch (err) {
      toast({
        title: 'Verification Failed',
        description: err.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleBackupCode = () => {
    setUseBackupCode(!useBackupCode);
    setCode('');
    clearError();
  };

  return (
    <Box maxW="md" mx="auto" mt={8}>
      <form onSubmit={handleSubmit}>
        <VStack spacing={6}>
          <Text fontSize="xl" fontWeight="bold">
            Two-Factor Authentication Required
          </Text>

          <Text>
            {useBackupCode
              ? 'Enter a backup code from your list of backup codes.'
              : 'Enter the verification code from your authenticator app.'}
          </Text>

          <FormControl isRequired>
            <FormLabel>
              {useBackupCode ? 'Backup Code' : 'Verification Code'}
            </FormLabel>
            <Input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={useBackupCode ? 'Enter backup code' : 'Enter 6-digit code'}
              autoComplete="off"
              maxLength={useBackupCode ? undefined : 6}
            />
          </FormControl>

          <HStack spacing={4} width="100%">
            <Button
              type="submit"
              colorScheme="blue"
              width="full"
              isLoading={isLoading}
              loadingText="Verifying..."
            >
              Verify
            </Button>
          </HStack>

          <Link
            color="blue.500"
            onClick={toggleBackupCode}
            _hover={{ textDecoration: 'underline', cursor: 'pointer' }}
          >
            {useBackupCode
              ? 'Use authenticator app instead'
              : "Can't access your authenticator app?"}
          </Link>

          {error && (
            <Text color="red.500" fontSize="sm">
              {error}
            </Text>
          )}
        </VStack>
      </form>
    </Box>
  );
};
