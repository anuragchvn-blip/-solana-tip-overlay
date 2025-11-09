/**
 * TipIndexer - Polls Solana for incoming tips and emits events
 */

import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { parseTipTransaction, extractMemo } from '../utils/transaction-parser.js';

export class TipIndexer {
  /**
   * @param {StorageAdapter} storage - Storage adapter
   * @param {object} options - Configuration options
   */
  constructor(storage, options = {}) {
    this.storage = storage;
    this.options = {
      cluster: options.cluster || 'devnet',
      rpcUrl: options.rpcUrl || null,
      pollInterval: options.pollInterval || 2500,
      commitment: options.commitment || 'confirmed',
      signatureLimit: options.signatureLimit || 20,
      ...options
    };

    this.connection = null;
    this.polling = false;
    this.pollTimer = null;
    this.eventHandlers = new Map();
  }

  /**
   * Initialize connection and start polling
   */
  async start() {
    // Setup Solana connection
    const endpoint = this.options.rpcUrl || clusterApiUrl(this.options.cluster);
    this.connection = new Connection(endpoint, this.options.commitment);
    
    console.log(`[Indexer] Connected to Solana ${this.options.cluster}`);
    console.log(`[Indexer] RPC: ${endpoint}`);

    // Start polling loop
    this.polling = true;
    this.poll();
  }

  /**
   * Stop polling
   */
  stop() {
    this.polling = false;
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
    console.log('[Indexer] Stopped');
  }

  /**
   * Main polling loop
   */
  async poll() {
    if (!this.polling) return;

    try {
      const streamers = await this.storage.getAllStreamers();
      
      for (const [streamerId, streamerData] of streamers) {
        await this.checkStreamerTips(streamerId, streamerData);
      }
    } catch (error) {
      console.error('[Indexer] Poll error:', error);
    }

    // Schedule next poll
    this.pollTimer = setTimeout(() => this.poll(), this.options.pollInterval);
  }

  /**
   * Check for tips for a specific streamer
   */
  async checkStreamerTips(streamerId, streamerData) {
    const { pubkey } = streamerData;
    
    try {
      const lastSeen = await this.storage.getLastSeen(pubkey);
      
      // Get recent signatures
      const options = { limit: this.options.signatureLimit };
      if (lastSeen) {
        options.until = lastSeen;
      }

      // Convert pubkey string to PublicKey object
      const publicKey = new PublicKey(pubkey);

      const signatures = await this.connection.getSignaturesForAddress(
        publicKey,
        options
      );

      // Process in oldest-first order
      const newSignatures = signatures.reverse();

      for (const sigInfo of newSignatures) {
        const { signature } = sigInfo;
        
        // Skip if already seen
        if (signature === lastSeen) continue;

        await this.processTransaction(streamerId, pubkey, signature);
        
        // Update last seen
        await this.storage.updateLastSeen(pubkey, signature);
      }

    } catch (error) {
      console.error(`[Indexer] Error checking tips for ${streamerId}:`, error.message);
    }
  }

  /**
   * Process a single transaction
   */
  async processTransaction(streamerId, streamerPubkey, signature) {
    try {
      const tx = await this.connection.getTransaction(signature, {
        commitment: this.options.commitment,
        maxSupportedTransactionVersion: 0
      });

      if (!tx || !tx.meta) {
        console.warn(`[Indexer] No transaction data for ${signature}`);
        return;
      }

      // Parse for tip
      const tipInfo = parseTipTransaction(tx, streamerPubkey);
      
      if (tipInfo) {
        const memo = extractMemo(tx);
        
        const tipData = {
          streamerId,
          streamerPubkey,
          from: tipInfo.from,
          amountLamports: tipInfo.amountLamports,
          amountSol: tipInfo.amountSol,
          txHash: signature,
          slot: tipInfo.slot,
          blockTime: tipInfo.blockTime,
          memo: memo || undefined
        };

        console.log(`[Indexer] 🎉 Tip detected: ${tipInfo.amountSol} SOL to ${streamerId}`);
        
        // Emit event
        this.emit('tip', tipData);
      }

    } catch (error) {
      console.error(`[Indexer] Error processing tx ${signature}:`, error.message);
    }
  }

  /**
   * Register event handler
   * @param {string} event - Event name ('tip')
   * @param {function} handler - Event handler function
   */
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
  }

  /**
   * Emit event to handlers
   */
  emit(event, data) {
    const handlers = this.eventHandlers.get(event) || [];
    handlers.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error(`[Indexer] Event handler error:`, error);
      }
    });
  }
}
