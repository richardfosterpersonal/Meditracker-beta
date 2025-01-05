const mockLocalForage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: jest.fn(),
  key: jest.fn(),
  keys: jest.fn(),
  iterate: jest.fn(),
  createInstance: jest.fn(() => mockLocalForage),
};

module.exports = mockLocalForage;
