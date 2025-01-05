import { AxiosError } from 'axios';

export enum SecurityErrorType {
    RATE_LIMIT = 'RATE_LIMIT',
    UNAUTHORIZED = 'UNAUTHORIZED',
    FORBIDDEN = 'FORBIDDEN',
    TOKEN_EXPIRED = 'TOKEN_EXPIRED',
    INVALID_TOKEN = 'INVALID_TOKEN',
}

interface SecurityError {
    type: SecurityErrorType;
    message: string;
    details?: Record<string, any>;
}

export function handleSecurityError(error: AxiosError): SecurityError {
    if (!error.response) {
        return {
            type: SecurityErrorType.UNAUTHORIZED,
            message: 'Network error occurred',
        };
    }

    switch (error.response.status) {
        case 429:
            return {
                type: SecurityErrorType.RATE_LIMIT,
                message: 'Too many requests. Please try again later.',
                details: error.response.headers,
            };
        case 401:
            if (error.response.data?.error === 'token_expired') {
                return {
                    type: SecurityErrorType.TOKEN_EXPIRED,
                    message: 'Your session has expired. Please log in again.',
                };
            }
            return {
                type: SecurityErrorType.UNAUTHORIZED,
                message: 'You are not authorized to perform this action.',
            };
        case 403:
            return {
                type: SecurityErrorType.FORBIDDEN,
                message: 'You do not have permission to access this resource.',
            };
        default:
            return {
                type: SecurityErrorType.UNAUTHORIZED,
                message: 'An authentication error occurred.',
            };
    }
}

export function isSecurityError(error: any): error is SecurityError {
    return error && Object.values(SecurityErrorType).includes(error.type);
}

export function getErrorMessage(error: unknown): string {
    if (isSecurityError(error)) {
        return error.message;
    }
    
    if (error instanceof Error) {
        return error.message;
    }
    
    return 'An unknown error occurred';
}
