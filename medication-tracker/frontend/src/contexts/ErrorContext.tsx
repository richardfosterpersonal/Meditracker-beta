import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { AppError, ErrorState, ErrorAction, ErrorSeverity, ErrorCategory } from '../types/errors';

const initialState: ErrorState = {
  errors: [],
  isRecovering: false
};

const ErrorContext = createContext<{
  state: ErrorState;
  addError: (error: Omit<AppError, 'id' | 'timestamp'>) => void;
  removeError: (id: string) => void;
  clearErrors: () => void;
  recoverFromError: (error: AppError) => Promise<void>;
} | undefined>(undefined);

function errorReducer(state: ErrorState, action: ErrorAction): ErrorState {
  switch (action.type) {
    case 'ADD_ERROR':
      return {
        ...state,
        errors: [...state.errors, action.payload],
        lastError: action.payload
      };
    case 'REMOVE_ERROR':
      return {
        ...state,
        errors: state.errors.filter(error => error.id !== action.payload)
      };
    case 'CLEAR_ERRORS':
      return {
        ...state,
        errors: [],
        lastError: undefined
      };
    case 'SET_RECOVERING':
      return {
        ...state,
        isRecovering: action.payload
      };
    default:
      return state;
  }
}

export function ErrorProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(errorReducer, initialState);

  const addError = useCallback((error: Omit<AppError, 'id' | 'timestamp'>) => {
    const completeError: AppError = {
      ...error,
      id: uuidv4(),
      timestamp: Date.now()
    };
    dispatch({ type: 'ADD_ERROR', payload: completeError });

    // Log critical errors
    if (error.severity === ErrorSeverity.CRITICAL) {
      console.error('Critical Error:', {
        ...completeError,
        componentStack: error.componentStack
      });
    }
  }, []);

  const removeError = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_ERROR', payload: id });
  }, []);

  const clearErrors = useCallback(() => {
    dispatch({ type: 'CLEAR_ERRORS' });
  }, []);

  const recoverFromError = useCallback(async (error: AppError) => {
    if (!error.recoveryAction) {
      console.warn('No recovery action available for error:', error);
      return;
    }

    dispatch({ type: 'SET_RECOVERING', payload: true });
    try {
      await error.recoveryAction();
      removeError(error.id);
    } catch (recoveryError) {
      addError({
        message: 'Failed to recover from error',
        severity: ErrorSeverity.HIGH,
        category: ErrorCategory.SYSTEM,
        error: recoveryError as Error,
        context: { originalError: error }
      });
    } finally {
      dispatch({ type: 'SET_RECOVERING', payload: false });
    }
  }, [addError, removeError]);

  const value = {
    state,
    addError,
    removeError,
    clearErrors,
    recoverFromError
  };

  return <ErrorContext.Provider value={value}>{children}</ErrorContext.Provider>;
}

export function useError() {
  const context = useContext(ErrorContext);
  if (context === undefined) {
    throw new Error('useError must be used within an ErrorProvider');
  }
  return context;
}
