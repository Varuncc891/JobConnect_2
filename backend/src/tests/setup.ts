// This file runs before each test
import { jest } from '@jest/globals';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_EXPIRE = '7d';
process.env.COOKIE_EXPIRE = '7';

// Increase timeout for tests
jest.setTimeout(10000);

// Global mock for console methods to keep test output clean
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
};