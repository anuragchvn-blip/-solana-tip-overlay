/**
 * WebSocketBroadcaster - Manages WebSocket connections and broadcasts tip events
 */

import { WebSocketServer } from 'ws';

export class WebSocketBroadcaster {
  constructor(options = {}) {
    this.wss = null;
    this.subscriptions = new Map(); // ws -> Set<streamerId>
    this.options = {
      pingInterval: options.pingInterval || 30000,
      maxAlertsPerWindow: options.maxAlertsPerWindow || 4,
      alertWindowMs: options.alertWindowMs || 10000,
      ...options
    };
    this.alertCounts = new Map(); // streamerId -> [{timestamp, count}]
  }

  /**
   * Initialize WebSocket server
   * @param {object} server - HTTP server instance or options
   */
  init(server) {
    this.wss = new WebSocketServer(server);
    
    this.wss.on('connection', (ws, req) => {
      console.log('[WS] Client connected from', req.socket.remoteAddress);
      
      ws.isAlive = true;
      ws.on('pong', () => { ws.isAlive = true; });
      
      ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString());
          this.handleMessage(ws, msg);
        } catch (error) {
          console.error('[WS] Parse error:', error);
        }
      });

      ws.on('close', () => {
        console.log('[WS] Client disconnected');
        this.subscriptions.delete(ws);
      });

      ws.on('error', (error) => {
        console.error('[WS] Socket error:', error);
      });
    });

    // Heartbeat ping
    this.pingInterval = setInterval(() => {
      this.wss.clients.forEach((ws) => {
        if (ws.isAlive === false) {
          return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
      });
    }, this.options.pingInterval);

    console.log('[WS] WebSocket server initialized');
  }

  /**
   * Handle incoming WebSocket messages
   */
  handleMessage(ws, msg) {
    switch (msg.action || msg.type) {
      case 'subscribe':
        if (msg.streamer) {
          if (!this.subscriptions.has(ws)) {
            this.subscriptions.set(ws, new Set());
          }
          this.subscriptions.get(ws).add(msg.streamer);
          ws.send(JSON.stringify({
            type: 'subscribed',
            streamer: msg.streamer
          }));
          console.log(`[WS] Client subscribed to ${msg.streamer}`);
        }
        break;
      
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong' }));
        break;
      
      default:
        console.warn('[WS] Unknown message type:', msg.type);
    }
  }

  /**
   * Broadcast a tip event to subscribers
   * @param {string} streamerId - Streamer who received the tip
   * @param {object} tipData - Tip information
   */
  broadcastTip(streamerId, tipData) {
    // Rate limiting
    if (!this.shouldBroadcast(streamerId)) {
      console.warn(`[WS] Rate limit exceeded for ${streamerId}`);
      return;
    }

    const payload = {
      type: 'tip',
      payload: {
        streamerId,
        ...tipData
      }
    };

    const message = JSON.stringify(payload);
    let sentCount = 0;

    this.wss.clients.forEach((ws) => {
      const subs = this.subscriptions.get(ws);
      if (subs && subs.has(streamerId) && ws.readyState === 1) {
        ws.send(message);
        sentCount++;
      }
    });

    console.log(`[WS] Broadcasted tip for ${streamerId} to ${sentCount} clients`);
  }

  /**
   * Rate limiting check
   */
  shouldBroadcast(streamerId) {
    const now = Date.now();
    const windowMs = this.options.alertWindowMs;
    
    if (!this.alertCounts.has(streamerId)) {
      this.alertCounts.set(streamerId, []);
    }

    const counts = this.alertCounts.get(streamerId);
    
    // Remove old entries
    const filtered = counts.filter(entry => now - entry < windowMs);
    
    if (filtered.length >= this.options.maxAlertsPerWindow) {
      return false;
    }

    filtered.push(now);
    this.alertCounts.set(streamerId, filtered);
    return true;
  }

  /**
   * Cleanup
   */
  close() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
    if (this.wss) {
      this.wss.close();
    }
  }
}
