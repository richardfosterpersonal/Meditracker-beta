/**
 * Validation Feedback Component
 * Last Updated: 2024-12-25T20:45:12+01:00
 * Status: STABLE
 * Reference: ../../../docs/validation/critical_path/MASTER_CRITICAL_PATH.md
 *
 * Implements user-facing validation feedback:
 * 1. Clear status indication
 * 2. Helpful error messages
 * 3. Accessibility support
 */

import React from 'react';
import './ValidationFeedback.css';

interface ValidationFeedbackProps {
  status: 'success' | 'error' | 'warning' | 'info';
  message: string;
  details?: string[];
  onClose?: () => void;
}

export const ValidationFeedback: React.FC<ValidationFeedbackProps> = ({
  status,
  message,
  details,
  onClose
}) => {
  // Critical Path: Accessibility
  const getAriaRole = () => {
    switch (status) {
      case 'error':
        return 'alert';
      case 'warning':
        return 'alert';
      default:
        return 'status';
    }
  };

  // Critical Path: User Safety
  const getIcon = () => {
    switch (status) {
      case 'success':
        return '✓';
      case 'error':
        return '!';
      case 'warning':
        return '⚠';
      case 'info':
        return 'i';
      default:
        return '';
    }
  };

  return (
    <div
      className={`validation-feedback ${status}`}
      role={getAriaRole()}
      aria-live={status === 'error' ? 'assertive' : 'polite'}
    >
      <div className="feedback-icon" aria-hidden="true">
        {getIcon()}
      </div>

      <div className="feedback-content">
        <p className="feedback-message">{message}</p>
        {details && details.length > 0 && (
          <ul className="feedback-details">
            {details.map((detail, index) => (
              <li key={index}>{detail}</li>
            ))}
          </ul>
        )}
      </div>

      {onClose && (
        <button
          className="feedback-close"
          onClick={onClose}
          aria-label="Close feedback"
        >
          ×
        </button>
      )}
    </div>
  );
};
