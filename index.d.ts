// Type definitions for @solana-tip/sdk

declare module '@solana-tip/sdk' {
  import { Connection, Transaction, PublicKey } from '@solana/web3.js';
  import { Server as HTTPServer } from 'http';

  // ===== Storage Adapters =====

  export interface StreamerData {
    pubkey: string;
    message: string;
    registeredAt: number;
  }

  export abstract class StorageAdapter {
    registerStreamer(streamerId: string, pubkey: string, message: string): Promise<void>;
    getStreamer(streamerId: string): Promise<StreamerData | null>;
    getAllStreamers(): Promise<Map<string, StreamerData>>;
    updateLastSeen(pubkey: string, signature: string): Promise<void>;
    getLastSeen(pubkey: string): Promise<string | null>;
  }

  export class LowdbAdapter extends StorageAdapter {
    constructor(filePath?: string);
    init(): Promise<void>;
  }

  export class MemoryAdapter extends StorageAdapter {
    constructor();
    clear(): void;
  }

  // ===== Core Classes =====

  export interface TipData {
    streamerId: string;
    streamerPubkey: string;
    from: string;
    amountLamports: number;
    amountSol: number;
    txHash: string;
    slot: number;
    blockTime: number;
    memo?: string;
  }

  export interface RegistrationResult {
    success: boolean;
    error?: string;
  }

  export class StreamerRegistry {
    constructor(storage: StorageAdapter);
    register(
      streamerId: string,
      pubkey: string,
      message: string,
      signature: string
    ): Promise<RegistrationResult>;
    getStreamer(streamerId: string): Promise<StreamerData | null>;
    getAllStreamers(): Promise<Map<string, StreamerData>>;
  }

  export interface IndexerOptions {
    cluster?: 'devnet' | 'mainnet-beta';
    rpcUrl?: string;
    pollInterval?: number;
    commitment?: 'processed' | 'confirmed' | 'finalized';
    signatureLimit?: number;
  }

  export class TipIndexer {
    constructor(storage: StorageAdapter, options?: IndexerOptions);
    start(): Promise<void>;
    stop(): void;
    on(event: 'tip', handler: (data: TipData) => void): void;
  }

  export interface WebSocketOptions {
    pingInterval?: number;
    maxAlertsPerWindow?: number;
    alertWindowMs?: number;
  }

  export class WebSocketBroadcaster {
    constructor(options?: WebSocketOptions);
    init(server: { server: HTTPServer } | HTTPServer): void;
    broadcastTip(streamerId: string, tipData: TipData): void;
    close(): void;
  }

  export interface SDKOptions {
    indexer?: IndexerOptions;
    websocket?: WebSocketOptions;
  }

  export class SolanaTipSDK {
    constructor(storage: StorageAdapter, options?: SDKOptions);
    start(): Promise<void>;
    stop(): void;
    initWebSocket(server: { server: HTTPServer } | HTTPServer): void;
    getRegistry(): StreamerRegistry;
    getIndexer(): TipIndexer;
    getBroadcaster(): WebSocketBroadcaster;
    on(event: 'tip', handler: (data: TipData) => void): void;
  }

  // ===== Utility Functions =====

  export function verifySignature(
    message: string,
    signatureBase58: string,
    pubkeyBase58: string
  ): boolean;

  export function createChallengeMessage(streamerId: string): string;

  export function parseTipTransaction(
    transaction: any,
    targetPubkey: string
  ): {
    from: string;
    amountLamports: number;
    amountSol: number;
    slot: number;
    blockTime: number;
  } | null;

  export function extractMemo(transaction: any): string | null;
}

// ===== Client SDK (Browser) =====

declare module '@solana-tip/sdk/client' {
  import { Transaction } from '@solana/web3.js';

  export class PhantomWalletAdapter {
    constructor();
    isInstalled(): boolean;
    connect(): Promise<string>;
    disconnect(): Promise<void>;
    signMessage(message: string): Promise<string>;
    signAndSendTransaction(transaction: Transaction): Promise<string>;
    getPublicKey(): string | null;
  }

  export interface SendTipParams {
    solanaWeb3: any;
    connection: any;
    wallet: PhantomWalletAdapter;
    streamerId: string;
    amountSol: number;
    memo?: string | null;
  }

  export class TipSender {
    constructor(apiBaseUrl?: string);
    getStreamerWallet(streamerId: string): Promise<{ pubkey: string; message: string; registeredAt: number }>;
    buildTipTransaction(
      solanaWeb3: any,
      fromPubkey: string,
      toPubkey: string,
      lamports: number,
      memo?: string | null
    ): Promise<Transaction>;
    sendTip(params: SendTipParams): Promise<string>;
    getExplorerUrl(signature: string, cluster?: 'devnet' | 'mainnet-beta'): string;
  }

  export interface TipEventData {
    streamerId: string;
    streamerPubkey: string;
    from: string;
    amountLamports: number;
    amountSol: number;
    txHash: string;
    slot: number;
    blockTime: number;
    memo?: string;
  }

  export class OverlayClient {
    constructor(wsUrl: string, streamerId: string);
    connect(): void;
    disconnect(): void;
    on(event: 'connected', handler: () => void): void;
    on(event: 'disconnected', handler: () => void): void;
    on(event: 'subscribed', handler: (streamer: string) => void): void;
    on(event: 'tip', handler: (data: TipEventData) => void): void;
    on(event: 'error', handler: (error: Error) => void): void;
    on(event: 'maxReconnectReached', handler: () => void): void;
    isConnected(): boolean;
  }
}

// ===== Adapters =====

declare module '@solana-tip/sdk/adapters' {
  export { StorageAdapter, LowdbAdapter, MemoryAdapter } from '@solana-tip/sdk';
}
