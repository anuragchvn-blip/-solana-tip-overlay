# Installation & Quick Start Guide

## 📦 Installation

### Option 1: Use as NPM Package (Recommended)

```bash
npm install solana-tip-overlay-sdk
```

### Option 2: Clone and Use Locally

```bash
git clone https://github.com/anuragchvn-blip/-solana-tip-overlay.git
cd -solana-tip-overlay
npm install
```

---

## 🚀 Quick Start (5 Minutes)

### Step 1: Run the Example Server

```bash
# Navigate to example
cd examples/express-server

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Start server (Windows)
start-dev.bat

# Or start server (Linux/Mac)
chmod +x start-dev.sh
./start-dev.sh

# Or start manually
node server.js
```

You should see:
```
🚀 Server running on http://localhost:3000
📡 WebSocket server ready at ws://localhost:3000/ws
⛓️  Solana cluster: devnet
```

### Step 2: Register a Streamer

1. Install **Phantom Wallet** (if not already installed)
   - Chrome: https://phantom.app/
   - Switch to Devnet in Phantom settings

2. Open http://localhost:3000/link.html
3. Enter a streamer ID (e.g., `mychannel`)
4. Click "Connect Phantom & Register"
5. Approve connection and sign message
6. **Copy the overlay URL** shown at the bottom

### Step 3: Get Devnet SOL

1. Visit https://faucet.solana.com/
2. Paste your Phantom wallet address
3. Request airdrop (you'll get 1-2 SOL)

### Step 4: Send a Test Tip

1. Open http://localhost:3000/viewer.html
2. Enter streamer ID: `mychannel` (or whatever you used)
3. Enter amount: `0.01`
4. Optional: Add a message
5. Click "Send Tip"
6. Approve transaction in Phantom
7. Wait for confirmation

### Step 5: Watch the Overlay

**Option A: Browser**
1. Open http://localhost:3000/overlay.html?streamer=mychannel
2. Keep it open in another window
3. You should see the tip animation appear!

**Option B: OBS Studio**
1. Open OBS
2. Add Source → **Browser**
3. Set URL: `http://localhost:3000/overlay.html?streamer=mychannel`
4. Set Width: 1920, Height: 1080
5. Click OK
6. Tip should appear in OBS preview when sent!

---

## 🧪 Quick Test (No Real SOL Required)

To test overlay without sending real SOL:

```bash
curl -X POST http://localhost:3000/api/simulate-tip \
  -H "Content-Type: application/json" \
  -d "{\"streamerId\":\"mychannel\",\"amountSol\":0.5,\"memo\":\"Test tip!\"}"
```

Or use PowerShell (Windows):
```powershell
Invoke-RestMethod -Uri http://localhost:3000/api/simulate-tip -Method POST -Body '{"streamerId":"mychannel","amountSol":0.5,"memo":"Test tip!"}' -ContentType "application/json"
```

The overlay should show the simulated tip immediately!

---

## 🛠️ Integration into Your App

### Backend Integration

```javascript
import express from 'express';
import { createServer } from 'http';
import { SolanaTipSDK, LowdbAdapter } from 'solana-tip-overlay-sdk';

const app = express();
const httpServer = createServer(app);

// Initialize SDK
const storage = new LowdbAdapter('./db.json');
const sdk = new SolanaTipSDK(storage, {
  indexer: {
    cluster: 'devnet',  // or 'mainnet-beta' for production
    pollInterval: 2500
  }
});

// Start SDK
await sdk.start();
sdk.initWebSocket({ server: httpServer });

// Add API routes
app.post('/api/register', async (req, res) => {
  const { streamerId, pubkey, message, signature } = req.body;
  const result = await sdk.getRegistry().register(
    streamerId, pubkey, message, signature
  );
  res.json(result);
});

app.get('/api/streamer/:id', async (req, res) => {
  const streamer = await sdk.getRegistry().getStreamer(req.params.id);
  res.json(streamer || { error: 'Not found' });
});

httpServer.listen(3000);
```

### Frontend Integration

```html
<script type="module">
  import { PhantomWalletAdapter, TipSender } from 'solana-tip-overlay-sdk/client';
  
  const wallet = new PhantomWalletAdapter();
  const tipSender = new TipSender();
  
  // Connect wallet and send tip
  await wallet.connect();
  const signature = await tipSender.sendTip({
    solanaWeb3: window.solanaWeb3,
    connection,
    wallet,
    streamerId: 'mychannel',
    amountSol: 0.1,
    memo: 'Great stream!'
  });
</script>
```

---

## 📚 Next Steps

1. **Customize the overlay** - Edit `examples/express-server/public/overlay.html`
   - Change colors, animations, sounds
   - Adjust position and timing

2. **Switch to mainnet** - Update `.env`:
   ```bash
   SOLANA_CLUSTER=mainnet-beta
   RPC_URL=https://your-rpc-provider.com
   ```

3. **Production deployment** - See README.md for:
   - PostgreSQL migration
   - HTTPS + WSS setup
   - PM2 process management
   - NGINX reverse proxy

4. **Read the docs**:
   - Main README: Full API documentation
   - Test Guide: `tests/test-polling.md`
   - Type Definitions: `index.d.ts`

---

## 🔧 Troubleshooting

### "Phantom wallet not found"
- Install Phantom from https://phantom.app/
- Refresh the page after installation

### "Streamer not found"
- Make sure you registered the streamer first via link.html
- Check registration: `curl http://localhost:3000/api/streamer/<id>`

### "Overlay not receiving tips"
- Wait 5-10 seconds (polling interval)
- Check server console for errors
- Verify WebSocket connection in browser console (F12)
- Ensure transaction confirmed on Solana Explorer

### "Port 3000 already in use"
- Change PORT in `.env` file
- Or stop other service using port 3000

---

## 💡 Tips

- **Devnet**: Use for development and testing (free SOL from faucet)
- **Mainnet**: Switch when ready for production (real SOL)
- **Custom RPC**: Use Helius/QuickNode for better reliability in production
- **OBS**: Use transparent background, position in bottom-right
- **Testing**: Use simulate-tip endpoint for rapid overlay testing

---

## 📞 Need Help?

- **Documentation**: See main README.md
- **Test Guide**: See tests/test-polling.md
- **Examples**: Check examples/express-server/
- **Issues**: https://github.com/anuragchvn-blip/-solana-tip-overlay/issues

---

**You're all set! Start accepting tips on Solana! 🎉**
