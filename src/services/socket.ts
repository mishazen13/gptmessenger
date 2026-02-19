// services/socket.ts
import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;

  connect(token: string) {
    if (this.socket?.connected) {
      console.log('Socket already connected');
      return this.socket;
    }

    const SERVER_URL = 'http://192.168.0.106:4000';
    
    console.log('Connecting to socket server at:', SERVER_URL);
    
    this.socket = io(SERVER_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      autoConnect: true,
      withCredentials: true,
      path: '/socket.io',
      forceNew: true
    });

    this.socket.on('connect', () => {
      console.log('✅ Socket connected successfully', this.socket?.id);
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error.message);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
    });

    return this.socket;
  }

  getSocket() {
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  on(event: string, callback: (...args: any[]) => void) {
    this.socket?.on(event, callback);
  }

  off(event: string, callback?: (...args: any[]) => void) {
    this.socket?.off(event, callback);
  }

  emit(event: string, ...args: any[]) {
    if (!this.socket?.connected) {
      console.warn(`⚠️ Cannot emit ${event}: socket not connected`);
      return;
    }
    console.log(`📤 Emitting ${event}`, args);
    this.socket.emit(event, ...args);
  }
}

export default new SocketService();