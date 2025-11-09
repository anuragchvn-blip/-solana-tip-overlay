/**
 * SolanaTipSDK - Main SDK class that orchestrates all components
 */

import { StreamerRegistry } from './StreamerRegistry.js';
import { TipIndexer } from './TipIndexer.js';
import { WebSocketBroadcaster } from './WebSocketBroadcaster.js';

export class SolanaTipSDK {
  /**
   * Initialize the SDK
   * @param {StorageAdapter} storage - Storage adapter instance
   * @param {object} options - Configuration options
   */
  constructor(storage, options = {}) {
    if (!storage) {
      throw new Error('Storage adapter is required');
    }

    this.storage = storage;
    this.options = options;

    // Initialize components
    this.registry = new StreamerRegistry(storage);
    this.indexer = new TipIndexer(storage, options.indexer || {});
    this.broadcaster = new WebSocketBroadcaster(options.websocket || {});

    // Wire up indexer to broadcaster
    this.indexer.on('tip', (tipData) => {
      this.broadcaster.broadcastTip(tipData.streamerId, tipData);
    });
  }

  /**
   * Initialize storage (if needed) and start indexing
   */
  async start() {
    // Initialize storage if it has an init method
    if (typeof this.storage.init === 'function') {
      await this.storage.init();
    }

    // Start indexer
    await this.indexer.start();
    
    console.log('[SDK] Started successfully');
  }

  /**
   * Stop indexing
   */
  stop() {
    this.indexer.stop();
    this.broadcaster.close();
    console.log('[SDK] Stopped');
  }

  /**
   * Initialize WebSocket server
   * @param {object} server - HTTP server or WebSocket options
   */
  initWebSocket(server) {
    this.broadcaster.init(server);
  }

  /**
   * Get the streamer registry
   * @returns {StreamerRegistry}
   */
  getRegistry() {
    return this.registry;
  }

  /**
   * Get the tip indexer
   * @returns {TipIndexer}
   */
  getIndexer() {
    return this.indexer;
  }

  /**
   * Get the WebSocket broadcaster
   * @returns {WebSocketBroadcaster}
   */
  getBroadcaster() {
    return this.broadcaster;
  }

  /**
   * Register event handlers
   * @param {string} event - Event name
   * @param {function} handler - Handler function
   */
  on(event, handler) {
    this.indexer.on(event, handler);
  }
}
