/**
 * Validation Hook
 * Integrates with backend validation orchestrator
 * Compliant with SINGLE_SOURCE_VALIDATION.md
 */
import { useState } from 'react';
import axios from 'axios';
import { ValidationTypes } from '../types/validation';

interface ValidationStatus {
  loading: boolean;
  error?: string;
  evidence?: any;
}

interface ValidationRequest {
  type: ValidationTypes;
  data: any;
  component: string;
  feature?: string;
}

interface ValidationResponse {
  status: 'success' | 'error';
  evidence?: any;
  error?: string;
}

export const useValidation = () => {
  const [validationStatus, setValidationStatus] = useState<ValidationStatus>({
    loading: false
  });

  const validateMedication = async (request: ValidationRequest): Promise<ValidationResponse> => {
    setValidationStatus({ loading: true });
    
    try {
      // Call validation orchestrator
      const response = await axios.post('/api/v1/validation/validate', {
        type: request.type,
        data: request.data,
        component: request.component,
        feature: request.feature
      });
      
      setValidationStatus({
        loading: false,
        evidence: response.data.evidence
      });
      
      return {
        status: 'success',
        evidence: response.data.evidence
      };
      
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Validation failed';
      
      setValidationStatus({
        loading: false,
        error: errorMessage
      });
      
      return {
        status: 'error',
        error: errorMessage
      };
    }
  };

  return {
    validateMedication,
    validationStatus
  };
};
