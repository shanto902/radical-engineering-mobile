import { APP_CONFIG } from '../constants/config';

export type RealtimeEventHandler = (event: {
  type: string;
  collection?: string;
  event?: 'create' | 'update' | 'delete' | string;
  data?: any;
}) => void;

class DirectusRealtimeService {
  private ws: WebSocket | null = null;
  private listeners: Set<RealtimeEventHandler> = new Set();
  private reconnectTimeout: any = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private isConnecting = false;
  private isExplicitlyClosed = false;

  /**
   * Connect to Directus WebSocket endpoint (e.g. wss://admin.atiar.com.bd/websocket)
   */
  connect(force = false): void {
    if (this.isExplicitlyClosed && !force) return;
    this.isExplicitlyClosed = false;

    if (force) {
      this.reconnectAttempts = 0;
      if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
      if (this.ws) {
        try {
          this.ws.close();
        } catch {
          // ignore
        }
        this.ws = null;
      }
    } else if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    try {
      this.isConnecting = true;
      const wsUrl = `${APP_CONFIG.apiBaseUrl.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:')}/websocket`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnecting = false;
        this.reconnectAttempts = 0;

        // 1. Authenticate with Directus token if available
        if (APP_CONFIG.accessToken) {
          this.send({
            type: 'auth',
            access_token: APP_CONFIG.accessToken,
          });
        }

        // 2. Subscribe to settings singleton collection
        this.send({
          type: 'subscribe',
          collection: 'settings',
        });

        // 3. Subscribe to products collection for real-time inventory and updates
        this.send({
          type: 'subscribe',
          collection: 'products',
          query: {
            fields: ['id', 'status', 'price', 'name'],
          },
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);

          // Handle ping/pong heartbeat
          if (payload.type === 'ping') {
            this.send({ type: 'pong' });
            return;
          }

          // Handle Directus subscription notifications
          if (payload.type === 'subscription') {
            this.notifyListeners(payload);
          }
        } catch {
          // ignore non-json messages
        }
      };

      this.ws.onerror = () => {
        // Handled via onclose
      };

      this.ws.onclose = () => {
        this.isConnecting = false;
        this.scheduleReconnect();
      };
    } catch {
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  private send(payload: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(payload));
      } catch {
        // ignore send error
      }
    }
  }

  private scheduleReconnect(): void {
    if (this.isExplicitlyClosed) return;
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return;

    // Exponential backoff: 3s, 4.5s, 6.75s ... max 30s
    const delay = Math.min(30000, 3000 * Math.pow(1.5, this.reconnectAttempts));
    this.reconnectAttempts++;
    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Subscribe a listener callback to real-time events.
   * Returns an unsubscribe function.
   */
  onUpdate(callback: RealtimeEventHandler): () => void {
    this.listeners.add(callback);
    // Ensure connection is established
    this.connect();
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyListeners(event: any): void {
    this.listeners.forEach((cb) => {
      try {
        cb(event);
      } catch {
        // ignore listener failure
      }
    });
  }

  disconnect(): void {
    this.isExplicitlyClosed = true;
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
    }
  }
}

export const realtimeService = new DirectusRealtimeService();

