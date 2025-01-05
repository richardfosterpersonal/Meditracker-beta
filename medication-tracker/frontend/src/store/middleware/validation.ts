import { Middleware } from '@reduxjs/toolkit';
import { ZodError } from 'zod';
import * as schemas from '../../../../shared/validation/schemas';

export const validationMiddleware: Middleware = () => (next) => (action) => {
  // Only validate actions that have a payload and are not from our API services
  if (
    action.type.endsWith('/fulfilled') ||
    action.type.endsWith('/rejected') ||
    !action.payload
  ) {
    return next(action);
  }

  try {
    // Map action types to their corresponding validation schemas
    const schemaMap: Record<string, (data: unknown) => unknown> = {
      'medication/createMedication': schemas.validateMedication,
      'medication/updateMedication': schemas.validateMedication,
      'auth/login': schemas.validateLoginCredentials,
      'auth/register': schemas.validateRegisterData,
      // Add more schema mappings as needed
    };

    const validator = schemaMap[action.type];
    if (validator) {
      validator(action.payload);
    }

    return next(action);
  } catch (error) {
    if (error instanceof ZodError) {
      // Transform Zod validation errors into a more user-friendly format
      const validationError = {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: error.errors.reduce((acc, err) => {
          const path = err.path.join('.');
          acc[path] = err.message;
          return acc;
        }, {} as Record<string, string>),
      };

      // Dispatch a validation error action
      return next({
        type: `${action.type}/rejected`,
        error: validationError,
        meta: {
          requestId: action.meta?.requestId,
          arg: action.meta?.arg,
        },
      });
    }

    return next(action);
  }
};
