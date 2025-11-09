/**
 * Solana Tip SDK - Main Entry Point
 * 
 * Core SDK for building streamer tip systems on Solana.
 * Provides indexing, verification, and real-time notification capabilities.
 */

export { SolanaTipSDK } from './core/SolanaTipSDK.js';
export { StreamerRegistry } from './core/StreamerRegistry.js';
export { TipIndexer } from './core/TipIndexer.js';
export { WebSocketBroadcaster } from './core/WebSocketBroadcaster.js';
export { verifySignature, createChallengeMessage } from './utils/crypto.js';
export { parseTipTransaction } from './utils/transaction-parser.js';
