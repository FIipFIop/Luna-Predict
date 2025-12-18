# World Pay Mini App

A production-ready World App Mini App for secure WLD payments with World ID authentication.

## Features

- 🔐 **World ID Authentication** - Secure sign-in with World App wallet (SIWE)
- 💎 **WLD Payments** - Send Worldcoin payments on World Chain or Optimism
- 📊 **Transaction History** - Track all payment activity with status filtering
- 💰 **Balance Display** - Real-time WLD balance from World Chain
- 📱 **Mobile-First** - Optimized for World App environment

## Tech Stack

- **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3
- **SDK**: MiniKit JS v1.9.9 (World App payments)
- **Auth**: IDKit v1.0.0 (World ID verification - optional)
- **Networks**: World Chain (recommended), Optimism
- **Backend**: Existing server.js with API endpoints

## File Structure

```
miniapp/
├── index.html           # Main HTML with 4 screens
├── app.js              # Application logic & UI handlers
├── lib/
│   └── worldapp.js     # World App SDK wrapper utilities
├── styles/
│   └── app.css         # Complete styling (purple theme)
└── README.md           # This file
```

## Setup Instructions

### 1. Configure World App Credentials

You need to update the following files with your World App credentials:

#### `miniapp/lib/worldapp.js` (Line 33)
```javascript
app_id = 'app_681a53f34457fbb76319aac9d5258f5c', // ⚠️ INSERT YOUR APP ID HERE
```

**Where to get App ID:**
1. Go to [World ID Developer Portal](https://developer.worldcoin.org/)
2. Create a new app or use existing
3. Copy the `app_id` from your app settings

#### `miniapp/lib/worldapp.js` (Line 34)
```javascript
action = 'login', // ⚠️ INSERT YOUR ACTION ID HERE
```

**Where to configure Action:**
1. In Developer Portal, go to your app
2. Navigate to "Actions" section
3. Create an action named `login` or use existing
4. Update the code with your action name

#### `miniapp/app.js` (Line 9)
```javascript
const MERCHANT_ADDRESS = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'; // ⚠️ INSERT YOUR WALLET
```

**Replace with your Ethereum wallet address** where you want to receive WLD payments.

### 2. Backend Integration

The Mini App uses the existing backend API from `server.js`. Ensure these endpoints are working:

- `GET /api/auth/nonce` - Generate authentication nonce
- `POST /api/auth/wallet-login` - Verify SIWE signature
- `POST /api/payment/worldcoin/verify` - Verify WLD payment

### 3. Environment Variables

Ensure `.env` has required variables:

```env
# World ID Configuration
WORLD_ID_APP_ID=app_681a53f34457fbb76319aac9d5258f5c
WORLD_ID_ACTION_ID=login

# Payment Configuration
WORLDCOIN_RECEIVER_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb

# Network RPC URLs
WORLD_CHAIN_RPC_URL=https://worldchain-mainnet.g.alchemy.com/v2/demo
OPTIMISM_RPC_URL=https://mainnet.optimism.io
```

### 4. Deploy to Vercel

The Mini App is designed to work with your existing Vercel deployment:

```bash
# Deploy to production
vercel --prod
```

The app will be accessible at:
```
https://your-domain.vercel.app/miniapp/
```

### 5. Configure World App

Once deployed, add your Mini App to World App:

1. Go to [World App Developer Portal](https://developer.worldcoin.org/)
2. Navigate to your app
3. Add Mini App URL: `https://your-domain.vercel.app/miniapp/`
4. Configure permissions: `wallet`, `payment`
5. Submit for review

## How It Works

### Authentication Flow

1. User clicks "Sign in with World ID"
2. App requests nonce from backend (`/api/auth/nonce`)
3. MiniKit triggers SIWE wallet authentication
4. Backend verifies signature (`/api/auth/wallet-login`)
5. User session is created and stored

### Payment Flow

1. User enters WLD amount and selects network
2. App validates input and shows summary
3. User confirms payment
4. MiniKit sends WLD payment transaction
5. Backend verifies transaction (`/api/payment/worldcoin/verify`)
6. Transaction saved to local storage
7. Balance and stats updated

### Transaction History

- All transactions stored in localStorage
- Filter by status: All, Success, Pending, Failed
- Real-time updates after each payment
- Click hash to copy full transaction ID

## Networks

### World Chain (Recommended)
- **Network ID**: 480
- **RPC**: https://worldchain-mainnet.g.alchemy.com/v2/demo
- **WLD Token**: 0x2cFc85d8E48F8EAB294be644d9E25C3030863003
- **Gas**: FREE for World ID holders

### Optimism
- **Network ID**: 10
- **RPC**: https://mainnet.optimism.io
- **WLD Token**: 0xdC6fF44d5d932Cbd77B52E5612Ba0529DC6226F1
- **Gas**: Standard Optimism fees

## API Endpoints

### GET `/api/auth/nonce`
Generate SIWE nonce for wallet authentication.

**Response:**
```json
{
  "nonce": "random_nonce_string"
}
```

### POST `/api/auth/wallet-login`
Verify SIWE signature and create session.

**Request:**
```json
{
  "payload": { /* SIWE payload from MiniKit */ },
  "nonce": "nonce_from_previous_step"
}
```

**Response:**
```json
{
  "address": "0x...",
  "chainId": "480",
  "verified": true
}
```

### POST `/api/payment/worldcoin/verify`
Verify WLD payment transaction.

**Request:**
```json
{
  "transactionId": "0x...",
  "amount": 10.5,
  "network": "world-chain"
}
```

**Response:**
```json
{
  "verified": true,
  "credits": 5
}
```

## Customization

### Change Theme Color

Edit `miniapp/styles/app.css`:
```css
:root {
  --primary: #bd00ff;      /* Main purple */
  --primary-dark: #9900cc; /* Darker shade */
  --primary-light: #d94dff; /* Lighter shade */
}
```

### Change Merchant Address

Edit `miniapp/app.js`:
```javascript
const MERCHANT_ADDRESS = '0xYourAddress';
```

Also update recipient field in `miniapp/index.html` (line 114) if you want a different default.

### Add More Networks

Edit `miniapp/lib/worldapp.js` in the `sendPayment` method:
```javascript
// Add new network
const networkId = network === 'your-network' ? 'chain-id' : '10';
```

Update UI in `miniapp/index.html` to add radio option.

## Testing

### Local Testing
```bash
# Serve the miniapp folder
npx serve miniapp -p 3000

# Or use existing server
npm start
# Visit: http://localhost:3000/miniapp/
```

**Note**: MiniKit features only work inside World App. For local testing, you'll need to:
1. Deploy to a public URL (e.g., Vercel preview)
2. Add URL to World App Developer Portal
3. Test in actual World App

### World App Testing

1. Deploy to Vercel preview branch
2. Add preview URL to Developer Portal
3. Open in World App
4. Test sign-in and payment flows

## Security Notes

- ✅ All payments verified server-side
- ✅ SIWE signatures validated with nonce
- ✅ No private keys in frontend code
- ✅ Transaction history in localStorage only (no sensitive data)
- ⚠️ Remember to update API keys and wallet addresses
- ⚠️ Test with small amounts first

## Troubleshooting

### "MiniKit SDK not loaded"
- Check that `index.html` includes MiniKit CDN script
- Ensure you're testing inside World App (not regular browser)

### "Payment failed"
- Verify user has sufficient WLD balance
- Check network selection matches user's wallet
- Ensure merchant address is valid
- Check backend `/api/payment/worldcoin/verify` endpoint

### "Balance shows Error"
- Check RPC URL is accessible
- Verify WLD token contract address for selected network
- Ensure user's wallet address is valid

### Transaction not appearing
- Check localStorage in dev tools
- Verify `saveTransactions()` is called
- Clear localStorage and try again: `localStorage.clear()`

## Resources

- [World App MiniKit Docs](https://docs.worldcoin.org/mini-apps)
- [World ID Developer Portal](https://developer.worldcoin.org/)
- [SIWE Specification](https://eips.ethereum.org/EIPS/eip-4361)
- [World Chain Explorer](https://worldchain-mainnet.explorer.alchemy.com/)

## License

MIT

---

**Built with World App MiniKit** 🌍
