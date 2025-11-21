import { io, Socket } from 'socket.io-client';

// 使用类型断言避免import.meta.env类型问题
const WS_URL = (import.meta as any).env?.VITE_WS_URL || 'ws://localhost:4000';

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<Function>> = new Map();

  connect(): void {
    if (this.socket?.connected) {
      console.log('Already connected');
      return;
    }

    this.socket = io(WS_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });

    this.socket.on('connect', () => {
      console.log('✅ Connected to server:', this.socket?.id);
      this.emit('connection_status', { connected: true });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from server:', reason);
      this.emit('connection_status', { connected: false, reason });
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      this.emit('connection_error', { error: error.message });
    });

    // Forward all server events to registered listeners
    this.socket.onAny((event, ...args) => {
      console.log('📨 Received event:', event, args);
      this.emit(event, ...args);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      console.log('Disconnected');
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Send event to server
  send(event: string, data?: any): void {
    if (!this.socket?.connected) {
      console.error('Cannot send: not connected');
      return;
    }
    console.log('📤 Sending event:', event, data);
    this.socket.emit(event, data);
  }

  // Register event listener
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  // Unregister event listener
  off(event: string, callback: Function): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.delete(callback);
      if (listeners.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  // Remove all listeners for an event
  removeAllListeners(event?: string): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  // Internal: emit event to registered listeners
  private emit(event: string, ...args: any[]): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(...args);
        } catch (error) {
          console.error(`Error in listener for ${event}:`, error);
        }
      });
    }
  }

  // Convenience methods
  joinQueue(
    username: string,
    roomSize?: number,
    modelProvider?: string,
    mode: string = 'classic',
    seriesType: 'single' | 'best_of_five' = 'best_of_five'
  ): void {
    this.send('join_queue', { username, roomSize, modelProvider, mode, seriesType });
  }

  leaveQueue(): void {
    this.send('leave_queue');
  }

  submitAnswer(answer: string): void {
    this.send('submit_answer', { answer });
  }

  vote(suspectId: string): void {
    this.send('vote', { suspectId });
  }
}

export const socketService = new SocketService();
export default socketService;
