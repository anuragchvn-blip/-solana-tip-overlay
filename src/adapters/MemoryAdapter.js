/**
 * In-memory storage adapter
 * Useful for testing and development
 */

import { StorageAdapter } from './StorageAdapter.js';

export class MemoryAdapter extends StorageAdapter {
  constructor() {
    super();
    this.streamers = new Map();
    this.lastSeen = new Map();
  }

  async registerStreamer(streamerId, pubkey, message) {
    this.streamers.set(streamerId, {
      pubkey,
      message,
      registeredAt: Date.now()
    });
  }

  async getStreamer(streamerId) {
    return this.streamers.get(streamerId) || null;
  }

  async getAllStreamers() {
    return new Map(this.streamers);
  }

  async updateLastSeen(pubkey, signature) {
    this.lastSeen.set(pubkey, signature);
  }

  async getLastSeen(pubkey) {
    return this.lastSeen.get(pubkey) || null;
  }

  // Additional helper for testing
  clear() {
    this.streamers.clear();
    this.lastSeen.clear();
  }
}
