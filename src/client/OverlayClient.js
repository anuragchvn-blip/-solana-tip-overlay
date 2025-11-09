/**
 * OverlayClient - Client-side WebSocket client for overlays
 * Use this in browser environments (OBS overlay)
 */

export class OverlayClient {
  constructor(wsUrl, streamerId) {
    this.wsUrl = wsUrl;
    this.streamerId = streamerId;
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 2000;
    this.pingInterval = null;
    this.eventHandlers = new Map();
    this.connected = false;
  }

  /**
   * Connect to WebSocket server
   */
  connect() {
    console.log('[Overlay] Connecting to', this.wsUrl);
    
    this.ws = new WebSocket(this.wsUrl);

    this.ws.onopen = () => {
      console.log('[Overlay] Connected');
      this.connected = true;
      this.reconnectAttempts = 0;
      
      // Subscribe to streamer
      this.subscribe(this.streamerId);
      
      // Start heartbeat
      this.startHeartbeat();
      
      this.emit('connected');
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleMessage(data);
      } catch (error) {
        console.error('[Overlay] Parse error:', error);
      }
    };

    this.ws.onclose = () => {
      console.log('[Overlay] Disconnected');
      this.connected = false;
      this.stopHeartbeat();
      this.emit('disconnected');
      
      // Attempt reconnect
      this.reconnect();
    };

    this.ws.onerror = (error) => {
      console.error('[Overlay] WebSocket error:', error);
      this.emit('error', error);
    };
  }

  /**
   * Handle incoming WebSocket messages
   */
  handleMessage(data) {
    switch (data.type) {
      case 'subscribed':
        console.log('[Overlay] Subscribed to', data.streamer);
        this.emit('subscribed', data.streamer);
        break;
      
      case 'tip':
        console.log('[Overlay] Tip received:', data.payload);
        this.emit('tip', data.payload);
        break;
      
      case 'pong':
        // Heartbeat response
        break;
      
      default:
        console.warn('[Overlay] Unknown message type:', data.type);
    }
  }

  /**
   * Subscribe to streamer tips
   */
  subscribe(streamerId) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        action: 'subscribe',
        streamer: streamerId
      }));
    }
  }

  /**
   * Start heartbeat ping
   */
  startHeartbeat() {
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 20000); // Every 20 seconds
  }

  /**
   * Stop heartbeat
   */
  stopHeartbeat() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Reconnect logic
   */
  reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[Overlay] Max reconnect attempts reached');
      this.emit('maxReconnectReached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts;
    
    console.log(`[Overlay] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect() {
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
  }

  /**
   * Register event handler
   * @param {string} event - Event name (connected, disconnected, tip, error)
   * @param {function} handler - Handler function
   */
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
  }

  /**
   * Emit event
   */
  emit(event, data) {
    const handlers = this.eventHandlers.get(event) || [];
    handlers.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error('[Overlay] Event handler error:', error);
      }
    });
  }

  /**
   * Check if connected
   * @returns {boolean}
   */
  isConnected() {
    return this.connected;
  }
}
