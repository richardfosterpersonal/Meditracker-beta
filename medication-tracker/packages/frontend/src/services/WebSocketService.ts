import { io, Socket } from 'socket.io-client';
import { liabilityProtection } from '../utils/liabilityProtection';

export interface WebSocketMessage {
  type: 'MEDICATION_UPDATE' | 'EMERGENCY' | 'FAMILY_UPDATE' | 'SYSTEM' | 
        'MEDICATION_TAKEN' | 'MEDICATION_MISSED' | 'MEDICATION_DUE' | 'MEDICATION_REFILL' |
        'DOSE_UPDATE' | 'MEDICATION_SCHEDULE_UPDATE' | 'MEDICATION_ADDED' | 'MEDICATION_REMOVED' |
        'DOSE_REMINDER' | 'DRUG_INTERACTION' | 'EMERGENCY_UPDATE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  payload: any;
  timestamp: string;
}

class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private messageHandlers: Map<string, Function[]> = new Map();

  constructor() {
    this.initializeSocket();
  }

  private initializeSocket() {
    try {
      this.socket = io(process.env.REACT_APP_WEBSOCKET_URL || 'ws://localhost:8080', {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
      });

      this.setupEventListeners();
      
      // Log connection for liability
      liabilityProtection.logCriticalAction(
        'WEBSOCKET_CONNECT',
        'current-user',
        { timestamp: new Date().toISOString() }
      );
    } catch (error) {
      console.error('WebSocket initialization failed:', error);
      liabilityProtection.logLiabilityRisk(
        'WEBSOCKET_INIT_FAILED',
        'HIGH',
        { error }
      );
    }
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      
      // Log disconnection for liability
      liabilityProtection.logCriticalAction(
        'WEBSOCKET_DISCONNECT',
        'current-user',
        { reason, timestamp: new Date().toISOString() }
      );

      if (this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
        this.reconnectAttempts++;
        this.socket?.connect();
      } else {
        liabilityProtection.logLiabilityRisk(
          'WEBSOCKET_RECONNECT_FAILED',
          'HIGH',
          { attempts: this.reconnectAttempts }
        );
      }
    });

    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
      liabilityProtection.logLiabilityRisk(
        'WEBSOCKET_ERROR',
        'MEDIUM',
        { error }
      );
    });

    // Handle incoming messages
    this.socket.on('message', (message: WebSocketMessage) => {
      this.handleIncomingMessage(message);
    });
  }

  private handleIncomingMessage(message: WebSocketMessage) {
    // Log critical messages for liability
    if (message.priority === 'HIGH' || message.priority === 'CRITICAL') {
      liabilityProtection.logCriticalAction(
        'CRITICAL_MESSAGE_RECEIVED',
        'current-user',
        {
          type: message.type,
          priority: message.priority,
          timestamp: message.timestamp
        },
        true
      );
    }

    // Notify all registered handlers for this message type
    const handlers = this.messageHandlers.get(message.type) || [];
    handlers.forEach(handler => handler(message.payload));
  }

  public subscribe(messageType: WebSocketMessage['type'], handler: Function) {
    const handlers = this.messageHandlers.get(messageType) || [];
    this.messageHandlers.set(messageType, [...handlers, handler]);

    // Return unsubscribe function
    return () => {
      const handlers = this.messageHandlers.get(messageType) || [];
      this.messageHandlers.set(
        messageType,
        handlers.filter(h => h !== handler)
      );
    };
  }

  public async send(message: Omit<WebSocketMessage, 'timestamp'>) {
    if (!this.socket?.connected) {
      throw new Error('WebSocket is not connected');
    }

    const fullMessage: WebSocketMessage = {
      ...message,
      timestamp: new Date().toISOString()
    };

    try {
      await this.socket.emit('message', fullMessage);

      // Log critical messages for liability
      if (message.priority === 'HIGH' || message.priority === 'CRITICAL') {
        liabilityProtection.logCriticalAction(
          'CRITICAL_MESSAGE_SENT',
          'current-user',
          {
            type: message.type,
            priority: message.priority,
            timestamp: fullMessage.timestamp
          },
          true
        );
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      liabilityProtection.logLiabilityRisk(
        'MESSAGE_SEND_FAILED',
        'MEDIUM',
        { error, message: fullMessage }
      );
      throw error;
    }
  }

  public disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const webSocketService = new WebSocketService();
