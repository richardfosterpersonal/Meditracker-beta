import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChakraProvider } from '@chakra-ui/react';
import { Login } from '../Login';
import { MFAVerification } from '../MFAVerification';
import { MFASetup } from '../MFASetup';
import { AuthProvider } from '../../../context/AuthContext';
import { MFAService } from '../../../services/security/MFAService';

// Mock the MFA service
jest.mock('../../../services/security/MFAService', () => ({
  getInstance: jest.fn(() => ({
    setupMFA: jest.fn(),
    verifyCode: jest.fn(),
    verifyBackupCode: jest.fn(),
  })),
}));

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <ChakraProvider>
      <AuthProvider>{component}</AuthProvider>
    </ChakraProvider>
  );
};

describe('MFA Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe('Login with MFA', () => {
    it('should show MFA verification screen after successful login with MFA required', async () => {
      const mockLogin = jest.fn().mockResolvedValue({ mfaRequired: true, userId: '123' });
      jest.spyOn(React, 'useContext').mockImplementation(() => ({
        login: mockLogin,
        mfaRequired: true,
        error: null,
        clearError: jest.fn(),
      }));

      renderWithProviders(<Login />);

      // Fill in login form
      await userEvent.type(screen.getByPlaceholderText(/email/i), 'test@example.com');
      await userEvent.type(screen.getByPlaceholderText(/password/i), 'password123');
      
      // Submit form
      fireEvent.click(screen.getByRole('button', { name: /log in/i }));

      // Verify MFA screen is shown
      await waitFor(() => {
        expect(screen.getByText(/two-factor authentication required/i)).toBeInTheDocument();
      });
    });

    it('should handle MFA verification success', async () => {
      const mfaService = MFAService.getInstance();
      (mfaService.verifyCode as jest.Mock).mockResolvedValue({ valid: true });

      renderWithProviders(<MFAVerification />);

      // Enter verification code
      await userEvent.type(screen.getByPlaceholderText(/enter 6-digit code/i), '123456');
      
      // Submit code
      fireEvent.click(screen.getByRole('button', { name: /verify/i }));

      // Verify success
      await waitFor(() => {
        expect(mfaService.verifyCode).toHaveBeenCalledWith(expect.any(String), '123456');
      });
    });

    it('should handle MFA verification failure', async () => {
      const mfaService = MFAService.getInstance();
      (mfaService.verifyCode as jest.Mock).mockResolvedValue({ 
        valid: false, 
        remainingAttempts: 2 
      });

      renderWithProviders(<MFAVerification />);

      // Enter verification code
      await userEvent.type(screen.getByPlaceholderText(/enter 6-digit code/i), '123456');
      
      // Submit code
      fireEvent.click(screen.getByRole('button', { name: /verify/i }));

      // Verify error message
      await waitFor(() => {
        expect(screen.getByText(/2 attempts remaining/i)).toBeInTheDocument();
      });
    });
  });

  describe('MFA Setup', () => {
    it('should handle successful MFA setup', async () => {
      const mfaService = MFAService.getInstance();
      (mfaService.setupMFA as jest.Mock).mockResolvedValue({
        qrCode: 'data:image/png;base64,test',
        backupCodes: ['12345678', '87654321'],
      });

      renderWithProviders(<MFASetup />);

      // Click setup button
      fireEvent.click(screen.getByRole('button', { name: /set up two-factor authentication/i }));

      // Verify QR code and backup codes are shown
      await waitFor(() => {
        expect(screen.getByAltText(/qr code/i)).toBeInTheDocument();
        expect(screen.getByText('12345678')).toBeInTheDocument();
        expect(screen.getByText('87654321')).toBeInTheDocument();
      });
    });

    it('should handle MFA setup failure', async () => {
      const mfaService = MFAService.getInstance();
      (mfaService.setupMFA as jest.Mock).mockRejectedValue(new Error('Setup failed'));

      renderWithProviders(<MFASetup />);

      // Click setup button
      fireEvent.click(screen.getByRole('button', { name: /set up two-factor authentication/i }));

      // Verify error message
      await waitFor(() => {
        expect(screen.getByText(/setup failed/i)).toBeInTheDocument();
      });
    });
  });

  describe('Backup Codes', () => {
    it('should allow switching to backup code entry', async () => {
      renderWithProviders(<MFAVerification />);

      // Click backup code link
      fireEvent.click(screen.getByText(/can't access your authenticator app/i));

      // Verify backup code input is shown
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/enter backup code/i)).toBeInTheDocument();
      });
    });

    it('should handle backup code verification', async () => {
      const mfaService = MFAService.getInstance();
      (mfaService.verifyBackupCode as jest.Mock).mockResolvedValue(true);

      renderWithProviders(<MFAVerification />);

      // Switch to backup code
      fireEvent.click(screen.getByText(/can't access your authenticator app/i));

      // Enter backup code
      await userEvent.type(screen.getByPlaceholderText(/enter backup code/i), '12345678');
      
      // Submit code
      fireEvent.click(screen.getByRole('button', { name: /verify/i }));

      // Verify backup code verification was called
      await waitFor(() => {
        expect(mfaService.verifyBackupCode).toHaveBeenCalledWith(expect.any(String), '12345678');
      });
    });
  });
});
