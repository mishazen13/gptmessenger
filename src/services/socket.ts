import { io, Socket } from 'socket.io-client';

const resolveSocketUrl = (): string => {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | boolean> }).env;
  const configured = env?.VITE_SOCKET_URL;

  if (typeof configured === 'string' && configured.trim()) {
    return configured;
  }

  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  return 'http://localhost:4000';
};

class SocketService {
  private socket: Socket | null = null;

  connect(token: string) {
    if (this.socket) {
      if (!this.socket.connected) {
        this.socket.auth = { token };
        this.socket.connect();
      }
      return this.socket;
    }

    const serverUrl = resolveSocketUrl();

    this.socket = io(serverUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 500,
      reconnectionDelayMax: 3000,
      timeout: 15000,
      withCredentials: true,
    });

    this.socket.on('connect', () => {
      console.log('✅ Socket connected:', this.socket?.id);
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
    this.socket.emit(event, ...args);
  }
}

export default new SocketService();
