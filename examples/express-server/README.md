# Solana Tip SDK - Express Server Example

Complete working example of the Solana Tip SDK integrated into an Express application.

## Features

✅ Streamer wallet registration with signature verification  
✅ Viewer tip sending interface  
✅ Real-time overlay with WebSocket  
✅ OBS Browser Source support  
✅ Dev mode tip simulation  

---

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env if needed (defaults work for local dev)
```

**Default Configuration:**
- Port: `3000`
- Cluster: `devnet`
- Poll Interval: `2500ms`

### 3. Start Server

**Windows:**
```bash
start-dev.bat
```

**Linux/Mac:**
```bash
chmod +x start-dev.sh
./start-dev.sh
```

**Or directly:**
```bash
node server.js
```

Server will be available at:
- **Streamer Link:** http://localhost:3000/link.html
- **Viewer:** http://localhost:3000/viewer.html
- **Overlay:** http://localhost:3000/overlay.html?streamer=<streamerId>

---

## Usage Guide

### For Streamers: Link Your Wallet

1. Open http://localhost:3000/link.html
2. Enter your streamer ID (e.g., `mychannel`)
3. Click "Connect Phantom & Register"
4. Approve connection and sign message in Phantom
5. Copy the overlay URL provided

### For Viewers: Send Tips

1. Get devnet SOL from https://faucet.solana.com/
2. Open http://localhost:3000/viewer.html
3. Enter streamer ID
4. Enter amount (minimum 0.001 SOL)
5. Optional: Add a message
6. Click "Send Tip" and approve in Phantom

### For OBS: Add Overlay

1. In OBS, add **Browser Source**
2. Set URL: `http://localhost:3000/overlay.html?streamer=<streamerId>`
3. Set dimensions: 1920x1080 (or your canvas size)
4. Enable: "Shutdown source when not visible"
5. Enable: "Refresh browser when scene becomes active"

---

## API Endpoints

### POST /api/register

Register a streamer with wallet signature.

**Request:**
```json
{
  "streamerId": "mychannel",
  "pubkey": "F7RG3...",
  "message": "Link streamer mychannel at 2025-11-09T...",
  "signature": "3Fg7K..."
}
```

**Response:**
```json
{
  "ok": true
}
```

### GET /api/streamer/:id

Get streamer wallet info.

**Response:**
```json
{
  "pubkey": "F7RG3...",
  "message": "Link streamer mychannel at ...",
  "registeredAt": 1699564800000
}
```

### GET /api/streamers

Get all registered streamers.

**Response:**
```json
{
  "streamers": [
    {
      "streamerId": "mychannel",
      "pubkey": "F7RG3...",
      "message": "...",
      "registeredAt": 1699564800000
    }
  ]
}
```

### POST /api/simulate-tip (Dev Only)

Simulate a tip for testing overlay.

**Request:**
```json
{
  "streamerId": "mychannel",
  "amountSol": 0.5,
  "from": "TestWallet",
  "memo": "Test message"
}
```

**Response:**
```json
{
  "ok": true,
  "message": "Simulated tip broadcasted"
}
```

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "cluster": "devnet",
  "env": "development"
}
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `NODE_ENV` | `development` | Environment mode |
| `SOLANA_CLUSTER` | `devnet` | Solana cluster (devnet or mainnet-beta) |
| `RPC_URL` | _(auto)_ | Custom RPC endpoint (optional) |
| `POLL_INTERVAL_MS` | `2500` | Tip polling interval in milliseconds |
| `DB_FILE` | `./db.json` | Path to lowdb database file |

---

## Testing

See `../../tests/test-polling.md` for comprehensive test guide.

### Quick Test

1. **Register:** Open link.html, connect Phantom, register
2. **Tip:** Get devnet SOL, open viewer.html, send 0.01 SOL
3. **Verify:** Open overlay.html, should see tip within 10 seconds

### Simulate Tip (No Real SOL)

```bash
curl -X POST http://localhost:3000/api/simulate-tip \
  -H "Content-Type: application/json" \
  -d '{"streamerId":"mychannel","amountSol":0.5,"memo":"Test"}'
```

---

## Production Deployment

### Switch to Mainnet

1. Update `.env`:
```bash
SOLANA_CLUSTER=mainnet-beta
RPC_URL=https://your-rpc-provider.com
NODE_ENV=production
```

2. Update frontend cluster references in HTML files

3. Use custom RPC (recommended):
   - Helius: https://helius.dev/
   - QuickNode: https://www.quicknode.com/
   - Alchemy: https://www.alchemy.com/

### Recommended Setup

- **Process Manager:** PM2 or systemd
- **Reverse Proxy:** NGINX with TLS (Let's Encrypt)
- **Database:** Migrate to PostgreSQL (implement custom adapter)
- **Monitoring:** Sentry, Datadog, or similar
- **Rate Limiting:** Add to API endpoints
- **CORS:** Restrict to allowed origins

### PM2 Example

```bash
npm install -g pm2

pm2 start server.js --name solana-tip
pm2 save
pm2 startup
```

---

## Customization

### Custom Storage Backend

Replace `LowdbAdapter` with your own:

```javascript
import { StorageAdapter } from '../../src/adapters/StorageAdapter.js';

class PostgresAdapter extends StorageAdapter {
  // Implement required methods
}

const storage = new PostgresAdapter(connectionString);
const sdk = new SolanaTipSDK(storage, options);
```

### Custom Overlay Design

Edit `public/overlay.html`:
- Change colors in CSS gradient
- Modify animation timing
- Add custom sounds
- Change position/size

### Rate Limiting

Adjust in server.js:

```javascript
const sdk = new SolanaTipSDK(storage, {
  websocket: {
    maxAlertsPerWindow: 4,  // Max alerts
    alertWindowMs: 10000     // Time window
  }
});
```

---

## Troubleshooting

### Overlay Not Receiving Tips

- Check server logs for errors
- Verify streamer registered: `curl http://localhost:3000/api/streamer/<id>`
- Check WebSocket connection in browser console
- Wait 5-10 seconds after transaction confirmation

### Phantom Connection Failed

- Ensure Phantom is installed and unlocked
- Check network in Phantom (should be Devnet for dev)
- Try refreshing the page

### Server Won't Start

- Check port 3000 is available
- Verify dependencies installed: `npm install`
- Check Node.js version: `node --version` (≥18)

---

## File Structure

```
express-server/
├── server.js              # Main Express server
├── package.json           # Dependencies
├── .env.example           # Environment template
├── .env                   # Your configuration (not committed)
├── db.json               # Lowdb database (auto-created)
├── start-dev.sh          # Linux/Mac startup script
├── start-dev.bat         # Windows startup script
└── public/
    ├── link.html         # Streamer registration UI
    ├── viewer.html       # Viewer tip sending UI
    ├── overlay.html      # OBS overlay
    └── sdk/              # Client SDK re-exports
        ├── PhantomWalletAdapter.js
        ├── TipSender.js
        ├── OverlayClient.js
        └── crypto-utils.js
```

---

## Support

- **SDK Documentation:** See main `../../README.md`
- **Test Guide:** See `../../tests/test-polling.md`
- **Issues:** https://github.com/anuragchvn-blip/-solana-tip-overlay/issues

---

**Happy streaming! 🎉**
