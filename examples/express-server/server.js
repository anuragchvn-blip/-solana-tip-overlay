/**
 * Example Express Server using Solana Tip SDK
 * 
 * This demonstrates how to integrate the SDK into an Express application
 */

import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { createServer } from 'http';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Import SDK components
import { SolanaTipSDK } from '../../src/index.js';
import { LowdbAdapter } from '../../src/adapters/index.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const PORT = process.env.PORT || 3000;
const SOLANA_CLUSTER = process.env.SOLANA_CLUSTER || 'mainnet-beta';
const DB_FILE = process.env.DB_FILE || './db.json';
const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS) || 15000; // 15 seconds for mainnet free RPC

// Initialize Express app
const app = express();
const httpServer = createServer(app);

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize SDK
console.log('[Server] Initializing Solana Tip SDK...');
const storage = new LowdbAdapter(DB_FILE);

const sdk = new SolanaTipSDK(storage, {
  indexer: {
    cluster: SOLANA_CLUSTER,
    rpcUrl: process.env.RPC_URL,
    pollInterval: POLL_INTERVAL_MS
  },
  websocket: {
    pingInterval: 30000,
    maxAlertsPerWindow: 4,
    alertWindowMs: 10000
  }
});

// API Routes

/**
 * POST /api/register
 * Register a streamer with signature verification
 */
app.post('/api/register', async (req, res) => {
  try {
    const { streamerId, pubkey, message, signature } = req.body;

    if (!streamerId || !pubkey || !message || !signature) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Missing required fields' 
      });
    }

    const result = await sdk.getRegistry().register(
      streamerId,
      pubkey,
      message,
      signature
    );

    if (result.success) {
      res.json({ ok: true });
    } else {
      res.status(400).json({ ok: false, error: result.error });
    }
  } catch (error) {
    console.error('[API] Registration error:', error);
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

/**
 * GET /api/streamer/:id
 * Get streamer wallet information
 */
app.get('/api/streamer/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const streamer = await sdk.getRegistry().getStreamer(id);

    if (!streamer) {
      return res.status(404).json({ error: 'Streamer not found' });
    }

    res.json(streamer);
  } catch (error) {
    console.error('[API] Get streamer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/streamers
 * Get all registered streamers (optional - for dashboard)
 */
app.get('/api/streamers', async (req, res) => {
  try {
    const streamers = await sdk.getRegistry().getAllStreamers();
    const streamersArray = Array.from(streamers.entries()).map(([id, data]) => ({
      streamerId: id,
      ...data
    }));
    res.json({ streamers: streamersArray });
  } catch (error) {
    console.error('[API] Get streamers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/simulate-tip (dev only)
 * Simulate a tip for testing overlay
 */
if (process.env.NODE_ENV === 'development') {
  app.post('/api/simulate-tip', async (req, res) => {
    try {
      const { streamerId, from, amountSol, memo } = req.body;

      const streamer = await sdk.getRegistry().getStreamer(streamerId);
      if (!streamer) {
        return res.status(404).json({ error: 'Streamer not found' });
      }

      const tipData = {
        streamerId,
        streamerPubkey: streamer.pubkey,
        from: from || 'SimulatedWallet',
        amountLamports: Math.floor((amountSol || 0.1) * 1e9),
        amountSol: amountSol || 0.1,
        txHash: 'simulated_' + Date.now(),
        slot: 123456,
        blockTime: Math.floor(Date.now() / 1000),
        memo: memo || 'Test tip'
      };

      sdk.getBroadcaster().broadcastTip(streamerId, tipData);
      
      res.json({ ok: true, message: 'Simulated tip broadcasted' });
    } catch (error) {
      console.error('[API] Simulate tip error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
}

/**
 * POST /api/rpc-proxy
 * Proxy RPC requests to Helius with API key (keeps key secret from browser)
 */
app.post('/api/rpc-proxy', async (req, res) => {
  try {
    const rpcUrl = process.env.RPC_URL || `https://api.${SOLANA_CLUSTER}.solana.com`;
    
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('[API] RPC proxy error:', error);
    res.status(500).json({ 
      jsonrpc: '2.0',
      error: { code: -32603, message: 'Internal error' },
      id: req.body.id 
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    cluster: SOLANA_CLUSTER,
    env: process.env.NODE_ENV || 'development'
  });
});

// Start server
async function start() {
  try {
    // Initialize and start SDK
    await sdk.start();
    
    // Initialize WebSocket server
    sdk.initWebSocket({ server: httpServer });

    // Start HTTP server
    httpServer.listen(PORT, () => {
      console.log(`\n🚀 Server running on http://localhost:${PORT}`);
      console.log(`📡 WebSocket server ready at ws://localhost:${PORT}/ws`);
      console.log(`⛓️  Solana cluster: ${SOLANA_CLUSTER}`);
      console.log(`\n📋 Links:`);
      console.log(`   Streamer Link: http://localhost:${PORT}/link.html`);
      console.log(`   Viewer: http://localhost:${PORT}/viewer.html`);
      console.log(`   Overlay: http://localhost:${PORT}/overlay.html?streamer=<streamerId>`);
      console.log(`\n✨ Ready to receive tips!\n`);
    });

    // Graceful shutdown
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (error) {
    console.error('[Server] Startup error:', error);
    process.exit(1);
  }
}

function shutdown() {
  console.log('\n[Server] Shutting down gracefully...');
  sdk.stop();
  httpServer.close(() => {
    console.log('[Server] Closed');
    process.exit(0);
  });
}

start();
