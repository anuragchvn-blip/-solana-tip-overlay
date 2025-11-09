# @solana-tip/sdk

**A complete SDK for building Solana tip overlays for streamers on devnet and mainnet.**

Enable your viewers to tip streamers directly with SOL, with real-time overlay animations in OBS. No on-chain program required - uses simple SPL transfers with signature verification.

---

## 🎯 Features

- ✅ **Streamer wallet linking** with ed25519 signature verification
- ✅ **Real-time tip detection** via Solana RPC polling
- ✅ **WebSocket broadcasting** for instant overlay updates
- ✅ **OBS Browser Source integration** with animations
- ✅ **Memo support** for custom tip messages
- ✅ **Rate limiting** and abuse prevention
- ✅ **Pluggable storage** (lowdb, PostgreSQL, Redis, etc.)
- ✅ **Easy devnet ↔ mainnet switching**

---

## 📦 Installation

```bash
npm install @solana-tip/sdk
```

**Peer Dependencies:**
```bash
npm install express @solana/web3.js
```

---

## 🚀 Quick Start

### 1. Backend Integration

```javascript
import express from 'express';
import { createServer } from 'http';
import { SolanaTipSDK, LowdbAdapter } from '@solana-tip/sdk';

const app = express();
const httpServer = createServer(app);

// Initialize SDK
const storage = new LowdbAdapter('./db.json');
const sdk = new SolanaTipSDK(storage, {
  indexer: {
    cluster: 'devnet', // or 'mainnet-beta'
    pollInterval: 2500
  }
});

// Start SDK
await sdk.start();

// Initialize WebSocket server
sdk.initWebSocket({ server: httpServer });

// Register streamer endpoint
app.post('/api/register', async (req, res) => {
  const { streamerId, pubkey, message, signature } = req.body;
  const result = await sdk.getRegistry().register(
    streamerId, pubkey, message, signature
  );
  res.json(result);
});

// Get streamer info endpoint
app.get('/api/streamer/:id', async (req, res) => {
  const streamer = await sdk.getRegistry().getStreamer(req.params.id);
  res.json(streamer || { error: 'Not found' });
});

httpServer.listen(3000);
```

### 2. Streamer Wallet Linking (Frontend)

```javascript
import { PhantomWalletAdapter } from '@solana-tip/sdk/client';

const wallet = new PhantomWalletAdapter();
const pubkey = await wallet.connect();

const message = `Link streamer ${streamerId} at ${new Date().toISOString()}`;
const signature = await wallet.signMessage(message);

// Send to your backend
await fetch('/api/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ streamerId, pubkey, message, signature })
});
```

### 3. Viewer Tipping (Frontend)

```javascript
import { TipSender } from '@solana-tip/sdk/client';
import * as solanaWeb3 from '@solana/web3.js';

const tipSender = new TipSender();
const connection = new solanaWeb3.Connection(
  solanaWeb3.clusterApiUrl('devnet')
);

const signature = await tipSender.sendTip({
  solanaWeb3,
  connection,
  wallet, // PhantomWalletAdapter instance
  streamerId: 'mychannel',
  amountSol: 0.1,
  memo: 'Great stream!'
});
```

### 4. OBS Overlay (Frontend)

```javascript
import { OverlayClient } from '@solana-tip/sdk/client';

const client = new OverlayClient('ws://localhost:3000/ws', 'mychannel');

client.on('tip', (tipData) => {
  // Display animation
  console.log(`${tipData.amountSol} SOL from ${tipData.from}`);
});

client.connect();
```

**In OBS:** Add Browser Source → `http://localhost:3000/overlay.html?streamer=mychannel`

---

## 📚 API Documentation

### Core SDK

#### `SolanaTipSDK`

Main SDK class that orchestrates all components.

```javascript
import { SolanaTipSDK } from '@solana-tip/sdk';

const sdk = new SolanaTipSDK(storage, options);
await sdk.start();
sdk.initWebSocket(server);
sdk.stop();
```

**Options:**
```javascript
{
  indexer: {
    cluster: 'devnet' | 'mainnet-beta',
    rpcUrl: string,           // Optional custom RPC
    pollInterval: 2500,       // Poll interval in ms
    commitment: 'confirmed',
    signatureLimit: 20        // Max signatures per poll
  },
  websocket: {
    pingInterval: 30000,
    maxAlertsPerWindow: 4,    // Rate limit
    alertWindowMs: 10000
  }
}
```

**Methods:**
- `start()` - Initialize storage and start indexing
- `stop()` - Stop indexing and close connections
- `initWebSocket(server)` - Initialize WebSocket server
- `getRegistry()` - Get `StreamerRegistry` instance
- `getIndexer()` - Get `TipIndexer` instance
- `getBroadcaster()` - Get `WebSocketBroadcaster` instance
- `on(event, handler)` - Register event handler

#### `StreamerRegistry`

Manages streamer wallet registration and verification.

```javascript
const registry = sdk.getRegistry();

// Register streamer with signature verification
const result = await registry.register(streamerId, pubkey, message, signature);
// Returns: { success: boolean, error?: string }

// Get streamer info
const streamer = await registry.getStreamer(streamerId);
// Returns: { pubkey, message, registeredAt } | null

// Get all streamers
const all = await registry.getAllStreamers();
// Returns: Map<streamerId, streamerData>
```

#### `TipIndexer`

Polls Solana for incoming tips and emits events.

```javascript
const indexer = sdk.getIndexer();

indexer.on('tip', (tipData) => {
  console.log('Tip detected:', tipData);
});

await indexer.start();
indexer.stop();
```

**Tip Event Data:**
```javascript
{
  streamerId: string,
  streamerPubkey: string,
  from: string,              // Sender wallet address
  amountLamports: number,
  amountSol: number,
  txHash: string,
  slot: number,
  blockTime: number,
  memo?: string              // Optional memo message
}
```

#### `WebSocketBroadcaster`

Manages WebSocket connections and broadcasts tip events.

```javascript
const broadcaster = sdk.getBroadcaster();

broadcaster.init(server);
broadcaster.broadcastTip(streamerId, tipData);
broadcaster.close();
```

**WebSocket Protocol:**

Client → Server:
```json
{ "action": "subscribe", "streamer": "mychannel" }
{ "type": "ping" }
```

Server → Client:
```json
{ "type": "subscribed", "streamer": "mychannel" }
{ "type": "tip", "payload": { ...tipData } }
{ "type": "pong" }
```

---

### Storage Adapters

#### `StorageAdapter` (Interface)

Base interface for custom storage backends.

```javascript
class CustomAdapter extends StorageAdapter {
  async registerStreamer(streamerId, pubkey, message) { }
  async getStreamer(streamerId) { }
  async getAllStreamers() { }
  async updateLastSeen(pubkey, signature) { }
  async getLastSeen(pubkey) { }
}
```

#### `LowdbAdapter`

File-based JSON storage (good for MVP/development).

```javascript
import { LowdbAdapter } from '@solana-tip/sdk/adapters';

const storage = new LowdbAdapter('./db.json');
await storage.init();
```

#### `MemoryAdapter`

In-memory storage (testing only, data lost on restart).

```javascript
import { MemoryAdapter } from '@solana-tip/sdk/adapters';

const storage = new MemoryAdapter();
```

#### PostgreSQL Adapter (Bring Your Own)

Example implementation:

```javascript
import { StorageAdapter } from '@solana-tip/sdk/adapters';
import pg from 'pg';

class PostgresAdapter extends StorageAdapter {
  constructor(connectionString) {
    super();
    this.pool = new pg.Pool({ connectionString });
  }

  async registerStreamer(streamerId, pubkey, message) {
    await this.pool.query(
      'INSERT INTO streamers (streamer_id, pubkey, message, registered_at) VALUES ($1, $2, $3, $4)',
      [streamerId, pubkey, message, Date.now()]
    );
  }

  async getStreamer(streamerId) {
    const res = await this.pool.query(
      'SELECT pubkey, message, registered_at FROM streamers WHERE streamer_id = $1',
      [streamerId]
    );
    return res.rows[0] || null;
  }

  // Implement other methods...
}
```

---

### Client SDK (Browser)

#### `PhantomWalletAdapter`

Browser utility for Phantom wallet integration.

```javascript
import { PhantomWalletAdapter } from '@solana-tip/sdk/client';

const wallet = new PhantomWalletAdapter();

// Check if Phantom is installed
if (wallet.isInstalled()) {
  // Connect wallet
  const pubkey = await wallet.connect();
  
  // Sign message
  const signature = await wallet.signMessage(message);
  
  // Sign and send transaction
  const txSignature = await wallet.signAndSendTransaction(transaction);
  
  // Disconnect
  await wallet.disconnect();
}
```

#### `TipSender`

Browser utility for sending tips.

```javascript
import { TipSender } from '@solana-tip/sdk/client';

const tipSender = new TipSender('/api');

// Get streamer wallet
const streamer = await tipSender.getStreamerWallet(streamerId);

// Build tip transaction
const tx = await tipSender.buildTipTransaction(
  solanaWeb3, fromPubkey, toPubkey, lamports, memo
);

// Send tip (all-in-one)
const signature = await tipSender.sendTip({
  solanaWeb3,
  connection,
  wallet,
  streamerId,
  amountSol,
  memo
});

// Get explorer URL
const url = tipSender.getExplorerUrl(signature, 'devnet');
```

#### `OverlayClient`

Browser WebSocket client for overlays.

```javascript
import { OverlayClient } from '@solana-tip/sdk/client';

const client = new OverlayClient('ws://localhost:3000/ws', 'mychannel');

// Event handlers
client.on('connected', () => console.log('Connected'));
client.on('disconnected', () => console.log('Disconnected'));
client.on('tip', (tipData) => console.log('Tip:', tipData));
client.on('error', (error) => console.error('Error:', error));

// Connect (with auto-reconnect)
client.connect();

// Disconnect
client.disconnect();
```

---

## 🛠️ Complete Example

See `examples/express-server/` for a full working implementation:

```bash
cd examples/express-server
npm install
cp .env.example .env
npm start
```

Then open:
- Streamer Link: http://localhost:3000/link.html
- Viewer Tip: http://localhost:3000/viewer.html
- OBS Overlay: http://localhost:3000/overlay.html?streamer=mychannel

---

## 🔐 Security & Best Practices

### Signature Verification
✅ All streamer registrations are verified with ed25519 signatures  
✅ No custody of funds - direct wallet-to-wallet transfers  

### Rate Limiting
✅ Configurable alert throttling (default: 4 alerts per 10s)  
✅ Minimum tip amount (0.001 SOL recommended)  

### Production Checklist
- [ ] Use HTTPS + WSS (TLS certificates via Let's Encrypt)
- [ ] Migrate from lowdb to PostgreSQL
- [ ] Add CORS restrictions to allowed origins
- [ ] Implement proper logging and monitoring (Sentry, etc.)
- [ ] Use custom RPC endpoint (Helius, QuickNode, etc.)
- [ ] Add rate limiting on API endpoints
- [ ] Set up process manager (PM2, systemd)
- [ ] Configure reverse proxy (NGINX)

### Switching to Mainnet

1. Change environment variable:
```bash
SOLANA_CLUSTER=mainnet-beta
```

2. Update frontend cluster references:
```javascript
const connection = new solanaWeb3.Connection(
  solanaWeb3.clusterApiUrl('mainnet-beta')
);
```

3. Use custom RPC for production (public endpoints rate-limit aggressively):
```bash
RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
```

---

## 📖 Advanced Usage

### Custom Storage Backend

```javascript
class RedisAdapter extends StorageAdapter {
  constructor(redisClient) {
    super();
    this.redis = redisClient;
  }

  async registerStreamer(streamerId, pubkey, message) {
    await this.redis.hSet(`streamer:${streamerId}`, {
      pubkey,
      message,
      registeredAt: Date.now()
    });
  }

  async getStreamer(streamerId) {
    const data = await this.redis.hGetAll(`streamer:${streamerId}`);
    return Object.keys(data).length ? data : null;
  }
  
  // Implement remaining methods...
}

const storage = new RedisAdapter(redisClient);
const sdk = new SolanaTipSDK(storage, options);
```

### Manual Tip Simulation (Dev Only)

```javascript
// In your server
app.post('/api/simulate-tip', (req, res) => {
  const { streamerId, amountSol } = req.body;
  
  sdk.getBroadcaster().broadcastTip(streamerId, {
    from: 'TestWallet',
    amountSol,
    amountLamports: amountSol * 1e9,
    txHash: 'simulated_' + Date.now(),
    slot: 123456,
    blockTime: Math.floor(Date.now() / 1000)
  });
  
  res.json({ ok: true });
});
```

### SPL Token Support (Future)

The SDK is designed to support SPL tokens. Future versions will include:
- Token account detection
- Token transfer parsing
- Multi-token overlay support

---

## 🧪 Testing

### Manual Test Plan

1. **Register Streamer**
```bash
# Open link.html, connect Phantom, register with streamer ID
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "streamerId": "test",
    "pubkey": "YOUR_PUBKEY",
    "message": "Link streamer test at 2025-11-09T...",
    "signature": "SIGNATURE_BASE58"
  }'
```

2. **Send Test Tip**
```bash
# Use Phantom in viewer.html to send 0.01 SOL on devnet
# Or get devnet SOL from: https://faucet.solana.com/
```

3. **Verify Overlay**
```bash
# Open overlay.html?streamer=test in browser or OBS
# Should see tip alert within 5 seconds of confirmation
```

4. **Simulate Tip (Dev)**
```bash
curl -X POST http://localhost:3000/api/simulate-tip \
  -H "Content-Type: application/json" \
  -d '{
    "streamerId": "test",
    "amountSol": 0.5,
    "memo": "Test tip"
  }'
```

---

## 🗺️ Roadmap

### Next Features
- [ ] SPL token tipping support
- [ ] On-chain event program (optional)
- [ ] Persistent leaderboards
- [ ] CSV export for payouts
- [ ] Multi-language support
- [ ] Dashboard UI for streamers
- [ ] Webhook notifications
- [ ] Mobile app support

### Migration Notes
- **PostgreSQL**: Implement `PostgresAdapter` extending `StorageAdapter`
- **Authentication**: Add JWT/session middleware for streamer dashboard
- **Monitoring**: Integrate Sentry, Datadog, or similar
- **CI/CD**: Add GitHub Actions for automated testing

---

## ⚖️ Legal & Compliance

**Important:** This SDK facilitates direct peer-to-peer transfers on Solana. Operators should:

- Review local regulations regarding money transmission
- Implement KYC/AML if required by jurisdiction
- Add transaction limits and monitoring for compliance
- Consult legal counsel before deploying to production

Anonymous tipping may have regulatory implications. For MVP (devnet), this is low-risk. For production (mainnet), especially at scale, seek legal guidance.

---

## 📄 License

MIT License - see LICENSE file

---

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Submit a pull request

---

## 💬 Support

- GitHub Issues: [Report bugs or request features](https://github.com/anuragchvn-blip/-solana-tip-overlay/issues)
- Documentation: This README and inline code comments
- Examples: See `examples/` directory

---

## 🙏 Acknowledgments

Built with:
- [@solana/web3.js](https://github.com/solana-labs/solana-web3.js)
- [TweetNaCl.js](https://github.com/dchest/tweetnacl-js)
- [ws](https://github.com/websockets/ws)
- [lowdb](https://github.com/typicode/lowdb)

---

**Ready to accept tips on Solana? Get started now! 🚀**
