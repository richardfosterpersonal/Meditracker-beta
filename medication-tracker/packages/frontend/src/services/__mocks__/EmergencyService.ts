// Mock implementation of EmergencyService
export const EmergencyService = {
  initializeEmergency: jest.fn().mockResolvedValue({ success: true }),
  updateLocation: jest.fn().mockResolvedValue({ success: true }),
  sendEmergencyAlert: jest.fn().mockResolvedValue({ success: true }),
  cancelEmergency: jest.fn().mockResolvedValue({ success: true }),
  getCurrentEmergencyStatus: jest.fn().mockResolvedValue({
    active: false,
    location: null,
    timestamp: null,
  }),
};

export default EmergencyService;
