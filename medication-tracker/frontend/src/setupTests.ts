/** @jest-environment jsdom */
import './setupPolyfills';
import '@testing-library/jest-dom';
import { TextDecoder, TextEncoder } from 'util';
import { jest } from '@jest/globals';
import { render as rtlRender, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import React, { ReactElement } from 'react';
import { toHaveNoViolations } from 'jest-axe';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

// Create a reusable mock toast function
export const mockToast = jest.fn();

// Mock fetch for RTK Query
global.fetch = jest.fn();

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock TextEncoder/TextDecoder
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock crypto
const crypto = {
  getRandomValues: (arr: any) => arr,
  subtle: {}
};
Object.defineProperty(window, 'crypto', {
  value: crypto
});

// Mock Chakra components
jest.mock('@chakra-ui/react', () => ({
  Modal: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ModalOverlay: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ModalContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ModalHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ModalBody: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ModalFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Badge: ({ children, colorScheme }: { children: React.ReactNode; colorScheme: string }) => (
    <div data-testid={`badge-${colorScheme}`}>{children}</div>
  ),
  Accordion: ({ children, allowToggle }: { children: React.ReactNode; allowToggle?: boolean }) => <div>{children}</div>,
  AccordionItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AccordionButton: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
  AccordionPanel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AccordionIcon: () => null,
  Icon: ({ as }: { as: any }) => <div data-testid={`icon-${as.name}`} />,
  Tooltip: ({ children, label }: { children: React.ReactNode; label?: string }) => <div title={label}>{children}</div>,
  VStack: ({ children, spacing, align }: { children: React.ReactNode; spacing?: number; align?: string }) => (
    <div data-testid="vstack">{children}</div>
  ),
  HStack: ({ children, spacing, justify, mt }: { children: React.ReactNode; spacing?: number; justify?: string; mt?: number }) => (
    <div data-testid="hstack">{children}</div>
  ),
  Box: ({ children, onClick, p, borderWidth, borderRadius, cursor, bg, _hover, flex }:
    { children: React.ReactNode; onClick?: () => void; p?: number; borderWidth?: number; borderRadius?: string;
      cursor?: string; bg?: string; _hover?: any; flex?: string | number }) => (
    <div onClick={onClick}>{children}</div>
  ),
  Button: ({ children, onClick, isDisabled, colorScheme, variant, mr }:
    { children: React.ReactNode; onClick?: () => void; isDisabled?: boolean; colorScheme?: string;
      variant?: string; mr?: number }) => (
    <button onClick={onClick} disabled={isDisabled}>{children}</button>
  ),
  Text: ({ children, fontSize, color, as, mt }:
    { children: React.ReactNode; fontSize?: string; color?: string; as?: string; mt?: number }) => (
    <div>{children}</div>
  ),
  useToast: () => ({
    toast: jest.fn()
  }),
  ChakraProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

// Mock framer-motion to avoid animation-related issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: 'div',
    nav: 'nav',
    ul: 'ul',
    li: 'li',
    p: 'p',
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock implementations
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

global.ResizeObserver = ResizeObserverMock;

window.matchMedia = window.matchMedia || function() {
  return {
    matches: false,
    addListener() {},
    removeListener() {},
  };
};

class IntersectionObserverMock {
  constructor(private callback: IntersectionObserverCallback) {}
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

global.IntersectionObserver = IntersectionObserverMock;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

interface TestWrapperProps {
  children: React.ReactNode;
  initialEntries?: string[];
}

const AllTheProviders = ({ children, initialEntries = ['/'] }: TestWrapperProps) => {
  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        {children}
      </MemoryRouter>
    </QueryClientProvider>
  );
};

// Custom render function with providers
export function render(
  ui: ReactElement,
  { initialEntries, ...options }: Omit<RenderOptions, 'wrapper'> & { initialEntries?: string[] } = {}
) {
  return rtlRender(ui, {
    wrapper: (props) => <AllTheProviders {...props} initialEntries={initialEntries} />,
    ...options,
  });
}

// Reset all mocks between tests
afterEach(() => {
  mockToast.mockReset();
  (global.fetch as jest.Mock).mockReset();
  localStorageMock.getItem.mockReset();
  localStorageMock.setItem.mockReset();
  localStorageMock.removeItem.mockReset();
  localStorageMock.clear.mockReset();
});

export * from '@testing-library/react';
