import { ChakraProvider } from '@chakra-ui/react';
import React from 'react';
import theme from './theme';

export const TestThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <ChakraProvider theme={theme}>{children}</ChakraProvider>;
};