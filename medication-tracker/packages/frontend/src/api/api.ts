import axios from 'axios';
import { EncryptionService } from '../services/security/EncryptionService';
import { HIPAAComplianceService } from '../services/security/HIPAAComplianceService';

export const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

const encryptionService = EncryptionService.getInstance();
const hipaaCompliance = HIPAAComplianceService.getInstance();

// Add request interceptor for authentication, encryption, and timezone
api.interceptors.request.use(async (config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // Add timezone information to requests
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  config.headers['X-User-Timezone'] = userTimezone;
  
  // Encrypt sensitive data in requests
  if (config.data && hipaaCompliance.containsPHI(config.data)) {
    const keyId = `request-${Date.now()}`;
    config.data = await encryptionService.encrypt(config.data, keyId);
    config.headers['X-Encryption-Key-Id'] = keyId;
  }
  
  return config;
});

// Add response interceptor for error handling, decryption, and timezone validation
api.interceptors.response.use(
  async (response) => {
    // Decrypt sensitive data in responses
    if (response.headers['x-encryption-key-id']) {
      const keyId = response.headers['x-encryption-key-id'];
      response.data = await encryptionService.decrypt(response.data, keyId);
    }

    // Validate timezone-sensitive data
    if (response.data?.scheduledTime || response.data?.notifications) {
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      response.data = validateTimezoneData(response.data, userTimezone);
    }

    // Log PHI access if applicable
    if (hipaaCompliance.containsPHI(response.data)) {
      await hipaaCompliance.logPHIAccess(
        localStorage.getItem('user_id') || 'unknown',
        'read',
        response.config.url || 'unknown'
      );
    }

    return response;
  },
  async (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Helper function to validate timezone-sensitive data
const validateTimezoneData = (data: any, userTimezone: string) => {
  if (Array.isArray(data)) {
    return data.map(item => validateTimezoneData(item, userTimezone));
  }
  
  if (typeof data === 'object' && data !== null) {
    const validated = { ...data };
    for (const [key, value] of Object.entries(data)) {
      if (key.toLowerCase().includes('time') || key.toLowerCase().includes('date')) {
        validated[key] = new Date(value).toLocaleString('en-US', { timeZone: userTimezone });
      } else if (typeof value === 'object') {
        validated[key] = validateTimezoneData(value, userTimezone);
      }
    }
    return validated;
  }
  
  return data;
};
