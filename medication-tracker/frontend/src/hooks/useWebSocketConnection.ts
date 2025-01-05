import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from './useAuth';

interface WebSocketMessage {
  type: string;
  payload: any;
}

interface UseWebSocketConnectionOptions {
  onMessage?: (message: WebSocketMessage) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
  reconnectAttempts?: number;
  reconnectInterval?: number;
}

export const useWebSocketConnection = (
  path: string,
  {
    onMessage,
    onConnected,
    onDisconnected,
    reconnectAttempts = 5,
    reconnectInterval = 3000,
  }: UseWebSocketConnectionOptions = {}
) => {
  const { getAccessToken } = useAuth();
  const ws = useRef<WebSocket | null>(null);
  const reconnectCount = useRef(0);
  const reconnectTimeoutId = useRef<NodeJS.Timeout>();
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const connect = useCallback(async () => {
    try {
      const token = await getAccessToken();
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = process.env.REACT_APP_WS_HOST || window.location.host;
      const wsUrl = `${protocol}//${host}${path}`;

      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setError(null);
        reconnectCount.current = 0;

        // Send authentication message
        if (ws.current && token) {
          ws.current.send(JSON.stringify({ type: 'auth', token }));
        }

        onConnected?.();
      };

      ws.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          onMessage?.(message);
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
          setError(err instanceof Error ? err : new Error('Failed to parse message'));
        }
      };

      ws.current.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        onDisconnected?.();

        // Attempt to reconnect if not at max attempts
        if (reconnectCount.current < reconnectAttempts) {
          reconnectTimeoutId.current = setTimeout(() => {
            reconnectCount.current++;
            connect();
          }, reconnectInterval);
        } else {
          setError(new Error('Maximum reconnection attempts reached'));
        }
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError(error instanceof Error ? error : new Error('WebSocket error'));
      };

    } catch (err) {
      console.error('Error establishing WebSocket connection:', err);
      setError(err instanceof Error ? err : new Error('Connection failed'));
    }
  }, [path, getAccessToken, onMessage, onConnected, onDisconnected, reconnectAttempts, reconnectInterval]);

  // Heartbeat to keep connection alive
  useEffect(() => {
    if (!isConnected) return;

    const pingInterval = setInterval(() => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000); // Send ping every 30 seconds

    return () => clearInterval(pingInterval);
  }, [isConnected]);

  // Connect on mount and cleanup on unmount
  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutId.current) {
        clearTimeout(reconnectTimeoutId.current);
      }
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [connect]);

  // Send message helper
  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    } else {
      setError(new Error('WebSocket is not connected'));
    }
  }, []);

  return {
    isConnected,
    error,
    sendMessage,
  };
};
