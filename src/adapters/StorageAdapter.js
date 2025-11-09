/**
 * StorageAdapter Interface
 * 
 * Implement this interface to provide custom storage backends
 * (PostgreSQL, MongoDB, Redis, etc.)
 */

export class StorageAdapter {
  /**
   * Register a streamer with their wallet
   * @param {string} streamerId - Unique streamer identifier
   * @param {string} pubkey - Solana public key (base58)
   * @param {string} message - Signed challenge message
   * @returns {Promise<void>}
   */
  async registerStreamer(streamerId, pubkey, message) {
    throw new Error('registerStreamer must be implemented');
  }

  /**
   * Get streamer information by ID
   * @param {string} streamerId - Streamer identifier
   * @returns {Promise<{pubkey: string, message: string, registeredAt: number} | null>}
   */
  async getStreamer(streamerId) {
    throw new Error('getStreamer must be implemented');
  }

  /**
   * Get all registered streamers
   * @returns {Promise<Map<string, {pubkey: string, message: string, registeredAt: number}>>}
   */
  async getAllStreamers() {
    throw new Error('getAllStreamers must be implemented');
  }

  /**
   * Update the last seen transaction signature for a pubkey
   * @param {string} pubkey - Solana public key
   * @param {string} signature - Transaction signature
   * @returns {Promise<void>}
   */
  async updateLastSeen(pubkey, signature) {
    throw new Error('updateLastSeen must be implemented');
  }

  /**
   * Get the last seen transaction signature for a pubkey
   * @param {string} pubkey - Solana public key
   * @returns {Promise<string | null>}
   */
  async getLastSeen(pubkey) {
    throw new Error('getLastSeen must be implemented');
  }
}
