module.exports = {
  ...require('./jest.config'),
  testMatch: [
    '<rootDir>/src/**/*.bench.{ts,tsx}'
  ],
  testEnvironment: 'node',
  reporters: [
    'default',
    ['jest-bench/reporter', { threshold: 0.9 }]
  ],
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json'
    }
  }
};
