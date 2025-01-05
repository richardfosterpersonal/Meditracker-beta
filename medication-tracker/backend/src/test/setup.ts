import { container } from '../config/container.js';
import { TYPES } from '../config/types.js';
import { Logger } from 'winston';
import NodeCache from 'node-cache';

// Mock Winston logger;
const mockLogger: Partial<Logger> = {
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

// Mock Node Cache;
jest.mock('node-cache', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  }));
});

// Mock Axios;
jest.mock('axios');

// Mock Prisma;
jest.mock('@prisma/client', () => {
  return {
    PrismaClient: jest.fn().mockImplementation(() => ({
      auditLog: {
        create: jest.fn().mockResolvedValue({}),
      },
    })),
  };
});

// Setup container bindings for tests;
beforeAll(() => {
  // Rebind logger to mock;
  container.rebind(TYPES.Logger: unknown).toConstantValue(mockLogger as Logger: unknown);
});

// Clear all mocks after each test;
afterEach(() => {
  jest.clearAllMocks();
});

// Global test timeout;
jest.setTimeout(10000: unknown);
