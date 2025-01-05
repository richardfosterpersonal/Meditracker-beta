import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import useWebSocketConnection from '../../hooks/useWebSocketConnection';

// Mock WebSocket
class MockWebSocket {
  onopen: () => void = () => {};
  onclose: () => void = () => {};
  onmessage: (event: any) => void = () => {};
  onerror: (error: any) => void = () => {};
  send: jest.Mock;
  close: jest.Mock;

  constructor() {
    this.send = jest.fn();
    this.close = jest.fn();
  }
}

// Mock getAccessToken function
const mockGetAccessToken = jest.fn().mockResolvedValue('mock-token');

describe('useWebSocketConnection', () => {
  let mockWs: MockWebSocket;

  beforeEach(() => {
    mockWs = new MockWebSocket();
    (global as any).WebSocket = jest.fn().mockImplementation(() => mockWs);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should establish connection and handle messages', async () => {
    const onMessage = jest.fn();
    const onConnected = jest.fn();
    const onDisconnected = jest.fn();

    const { result } = renderHook(() =>
      useWebSocketConnection('ws://localhost:8000/ws', {
        getAccessToken: mockGetAccessToken,
        onMessage,
        onConnected,
        onDisconnected,
      })
    );

    // Simulate successful connection
    act(() => {
      mockWs.onopen();
    });

    expect(onConnected).toHaveBeenCalled();
    expect(result.current.isConnected).toBe(true);

    // Simulate receiving a message
    const mockMessage = { data: JSON.stringify({ type: 'test', payload: 'data' }) };
    act(() => {
      mockWs.onmessage(mockMessage);
    });

    expect(onMessage).toHaveBeenCalledWith(JSON.parse(mockMessage.data));

    // Simulate disconnection
    act(() => {
      mockWs.onclose();
    });

    expect(onDisconnected).toHaveBeenCalled();
    expect(result.current.isConnected).toBe(false);
  });

  it('should handle connection errors', async () => {
    const onError = jest.fn();

    const { result } = renderHook(() =>
      useWebSocketConnection('invalid-url', {
        getAccessToken: mockGetAccessToken,
        onError,
      })
    );

    // Simulate connection error
    const mockError = new Error('Connection failed');
    act(() => {
      mockWs.onerror(mockError);
      mockWs.onclose();
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.isConnected).toBe(false);
  });

  it('should attempt to reconnect on connection loss', async () => {
    const { result } = renderHook(() =>
      useWebSocketConnection('ws://localhost:8000/ws', {
        getAccessToken: mockGetAccessToken,
        reconnectAttempts: 1,
        reconnectInterval: 100,
      })
    );

    // Simulate initial connection
    act(() => {
      mockWs.onopen();
    });

    expect(result.current.isConnected).toBe(true);

    // Simulate connection loss
    act(() => {
      mockWs.onclose();
    });

    // Wait for reconnect attempt
    await new Promise((resolve) => setTimeout(resolve, 150));

    expect((global as any).WebSocket).toHaveBeenCalledTimes(2);
  });

  it('should send messages when connected', async () => {
    const { result } = renderHook(() =>
      useWebSocketConnection('ws://localhost:8000/ws', {
        getAccessToken: mockGetAccessToken,
      })
    );

    // Simulate connection
    act(() => {
      mockWs.onopen();
    });

    const message = { type: 'test', data: 'message' };
    act(() => {
      result.current.sendMessage(message);
    });

    expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify(message));
  });
});
