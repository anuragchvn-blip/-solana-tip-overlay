/**
 * Lowdb file-based storage adapter
 * Simple JSON file storage for MVP deployments
 */

import { StorageAdapter } from './StorageAdapter.js';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';

export class LowdbAdapter extends StorageAdapter {
  constructor(filePath = './db.json') {
    super();
    this.filePath = filePath;
    this.db = null;
  }

  async init() {
    const adapter = new JSONFile(this.filePath);
    this.db = new Low(adapter, { streamers: {}, lastSeen: {} });
    await this.db.read();
    
    // Ensure structure exists
    this.db.data ||= { streamers: {}, lastSeen: {} };
    await this.db.write();
  }

  async registerStreamer(streamerId, pubkey, message) {
    await this.db.read();
    this.db.data.streamers[streamerId] = {
      pubkey,
      message,
      registeredAt: Date.now()
    };
    await this.db.write();
  }

  async getStreamer(streamerId) {
    await this.db.read();
    return this.db.data.streamers[streamerId] || null;
  }

  async getAllStreamers() {
    await this.db.read();
    return new Map(Object.entries(this.db.data.streamers));
  }

  async updateLastSeen(pubkey, signature) {
    await this.db.read();
    this.db.data.lastSeen[pubkey] = signature;
    await this.db.write();
  }

  async getLastSeen(pubkey) {
    await this.db.read();
    return this.db.data.lastSeen[pubkey] || null;
  }
}
