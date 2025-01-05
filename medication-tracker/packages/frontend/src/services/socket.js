import { useEffect, useRef } from 'react';

const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:8000';

class WebSocketClient {
    constructor() {
        this.ws = null;
        this.subscribers = new Map();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000; // Start with 1 second
    }

    connect() {
        try {
            this.ws = new WebSocket(`${WS_URL}/ws`);
            
            this.ws.onopen = () => {
                console.log('WebSocket connected');
                this.reconnectAttempts = 0;
                this.reconnectDelay = 1000;
            };
            
            this.ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                this.notifySubscribers(data);
            };
            
            this.ws.onclose = () => {
                console.log('WebSocket disconnected');
                this.attemptReconnect();
            };
            
            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
            };
        } catch (error) {
            console.error('WebSocket connection error:', error);
            this.attemptReconnect();
        }
    }

    attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            setTimeout(() => {
                console.log(`Attempting to reconnect (${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
                this.reconnectAttempts++;
                this.reconnectDelay *= 2; // Exponential backoff
                this.connect();
            }, this.reconnectDelay);
        } else {
            console.error('Max reconnection attempts reached');
        }
    }

    subscribe(id, callback) {
        this.subscribers.set(id, callback);
    }

    unsubscribe(id) {
        this.subscribers.delete(id);
    }

    notifySubscribers(data) {
        this.subscribers.forEach(callback => callback(data));
    }

    send(data) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        } else {
            console.error('WebSocket is not connected');
        }
    }

    close() {
        if (this.ws) {
            this.ws.close();
        }
    }
}

const wsClient = new WebSocketClient();

export const useWebSocket = (onMessage) => {
    const wsRef = useRef(wsClient);

    useEffect(() => {
        const id = Math.random().toString(36).substr(2, 9);
        
        if (!wsRef.current.ws || wsRef.current.ws.readyState !== WebSocket.OPEN) {
            wsRef.current.connect();
        }
        
        wsRef.current.subscribe(id, onMessage);
        
        return () => {
            wsRef.current.unsubscribe(id);
        };
    }, [onMessage]);

    return wsRef.current;
};

export default wsClient;
