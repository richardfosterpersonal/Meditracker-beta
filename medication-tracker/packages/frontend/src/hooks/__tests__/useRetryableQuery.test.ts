import { renderHook, act } from '@testing-library/react-hooks';
import { useRetryableQuery } from '../useRetryableQuery';

// Mock timer functions
jest.useFakeTimers();

describe('useRetryableQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  it('handles successful query', async () => {
    const mockData = { test: 'data' };
    const mockQuery = jest.fn().mockResolvedValue(mockData);

    const { result, waitForNextUpdate } = renderHook(() =>
      useRetryableQuery(mockQuery)
    );

    // Initially loading
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBe(null);
    expect(result.current.error).toBe(null);

    await waitForNextUpdate();

    // Success state
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBe(mockData);
    expect(result.current.error).toBe(null);
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  it('retries on failure with exponential backoff', async () => {
    const mockError = new Error('Test error');
    const mockQuery = jest.fn()
      .mockRejectedValueOnce(mockError)
      .mockRejectedValueOnce(mockError)
      .mockResolvedValueOnce({ test: 'success' });

    const onError = jest.fn();

    const { result, waitForNextUpdate } = renderHook(() =>
      useRetryableQuery(mockQuery, { maxRetries: 2, retryDelay: 1000, onError })
    );

    // First attempt fails
    await waitForNextUpdate();
    expect(mockQuery).toHaveBeenCalledTimes(1);

    // First retry
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    await waitForNextUpdate();
    expect(mockQuery).toHaveBeenCalledTimes(2);

    // Second retry
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    await waitForNextUpdate();
    expect(mockQuery).toHaveBeenCalledTimes(3);

    // Should succeed on third try
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toEqual({ test: 'success' });
    expect(result.current.error).toBe(null);
  });

  it('stops retrying after maxRetries', async () => {
    const mockError = new Error('Test error');
    const mockQuery = jest.fn().mockRejectedValue(mockError);
    const onError = jest.fn();

    const { result, waitForNextUpdate } = renderHook(() =>
      useRetryableQuery(mockQuery, { maxRetries: 2, retryDelay: 1000, onError })
    );

    // Initial attempt
    await waitForNextUpdate();

    // First retry
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    await waitForNextUpdate();

    // Second retry
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    await waitForNextUpdate();

    // Should be in error state after max retries
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(mockError);
    expect(mockQuery).toHaveBeenCalledTimes(3);
    expect(onError).toHaveBeenCalledWith(mockError);
  });

  it('allows manual retry after failure', async () => {
    const mockError = new Error('Test error');
    const mockQuery = jest.fn()
      .mockRejectedValueOnce(mockError)
      .mockResolvedValueOnce({ test: 'success' });

    const { result, waitForNextUpdate } = renderHook(() =>
      useRetryableQuery(mockQuery, { maxRetries: 0 })
    );

    // Initial failure
    await waitForNextUpdate();
    expect(result.current.error).toBe(mockError);

    // Manual retry
    act(() => {
      result.current.retry();
    });

    // Should be loading
    expect(result.current.loading).toBe(true);

    await waitForNextUpdate();

    // Should succeed
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toEqual({ test: 'success' });
    expect(result.current.error).toBe(null);
  });
});
