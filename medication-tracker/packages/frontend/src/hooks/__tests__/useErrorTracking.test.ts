import { renderHook, act } from '@testing-library/react';
import { useErrorTracking } from '../useErrorTracking';
import { ErrorProvider } from '../../contexts/ErrorContext';
import { ErrorSeverity, ErrorCategory } from '../../types/errors';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ErrorProvider>{children}</ErrorProvider>
);

describe('useErrorTracking', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('tracks error with string message', () => {
    const { result } = renderHook(() => useErrorTracking(), { wrapper });

    act(() => {
      result.current.trackError('Test error message');
    });

    // Verify error was tracked through ErrorContext
    // This would require checking the ErrorContext state
  });

  it('tracks error with Error object', () => {
    const { result } = renderHook(() => useErrorTracking(), { wrapper });
    const testError = new Error('Test error');

    act(() => {
      result.current.trackError(testError);
    });
  });

  it('tracks error with custom options', () => {
    const { result } = renderHook(() => useErrorTracking(), { wrapper });
    const context = { additionalInfo: 'test' };
    const recoveryAction = jest.fn();

    act(() => {
      result.current.trackError('Test error', {
        severity: ErrorSeverity.HIGH,
        category: ErrorCategory.NETWORK,
        context,
        recoveryAction: async () => {
          await recoveryAction();
        },
      });
    });
  });

  it('tracks promise rejection', async () => {
    const { result } = renderHook(() => useErrorTracking(), { wrapper });
    const testPromise = Promise.reject(new Error('Promise rejection'));

    await expect(
      result.current.trackPromise(testPromise)
    ).rejects.toThrow('Promise rejection');
  });

  it('tracks promise rejection with custom error message', async () => {
    const { result } = renderHook(() => useErrorTracking(), { wrapper });
    const testPromise = Promise.reject(new Error('Original error'));

    await expect(
      result.current.trackPromise(testPromise, {
        errorMessage: 'Custom error message',
      })
    ).rejects.toThrow('Original error');
  });

  it('passes through successful promise resolution', async () => {
    const { result } = renderHook(() => useErrorTracking(), { wrapper });
    const testPromise = Promise.resolve('success');

    await expect(
      result.current.trackPromise(testPromise)
    ).resolves.toBe('success');
  });
});
