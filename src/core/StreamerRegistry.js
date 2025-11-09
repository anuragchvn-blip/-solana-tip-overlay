/**
 * StreamerRegistry - Manages streamer wallet linking and verification
 */

import { verifySignature } from '../utils/crypto.js';

export class StreamerRegistry {
  /**
   * @param {StorageAdapter} storage - Storage adapter instance
   */
  constructor(storage) {
    this.storage = storage;
  }

  /**
   * Register a streamer with signature verification
   * @param {string} streamerId - Unique streamer identifier
   * @param {string} pubkey - Solana public key (base58)
   * @param {string} message - Challenge message that was signed
   * @param {string} signature - Signature (base58)
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async register(streamerId, pubkey, message, signature) {
    // Validate inputs
    if (!streamerId || !pubkey || !message || !signature) {
      return { success: false, error: 'Missing required fields' };
    }

    // Verify signature
    const isValid = verifySignature(message, signature, pubkey);
    if (!isValid) {
      return { success: false, error: 'Invalid signature' };
    }

    // Store mapping
    try {
      await this.storage.registerStreamer(streamerId, pubkey, message);
      console.log(`[Registry] Registered streamer ${streamerId} -> ${pubkey}`);
      return { success: true };
    } catch (error) {
      console.error('[Registry] Registration error:', error);
      return { success: false, error: 'Storage error' };
    }
  }

  /**
   * Get streamer info by ID
   * @param {string} streamerId - Streamer identifier
   * @returns {Promise<object|null>}
   */
  async getStreamer(streamerId) {
    return await this.storage.getStreamer(streamerId);
  }

  /**
   * Get all registered streamers
   * @returns {Promise<Map>}
   */
  async getAllStreamers() {
    return await this.storage.getAllStreamers();
  }
}
