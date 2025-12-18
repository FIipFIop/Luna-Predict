# Luna Predict - World App Integration Guide

This guide explains how to integrate Luna Predict with World App using Wallet Authentication and Worldcoin (WLD) payments.

## 🌙 About Luna Predict

Luna Predict is an AI-powered crypto chart analysis tool that runs inside World App. Users can get trading predictions by paying with WLD tokens on World Chain.

## Overview

Your app now supports:
- ✅ **Wallet Authentication (SIWE)** - Secure wallet-based login (RECOMMENDED)
- ✅ **Worldcoin Payments** - Accept WLD tokens on World Chain
- ✅ **Prediction History** - Track all user predictions and outcomes
- ✅ **Dual Payment Support** - Both SOL and WLD payments work

## ⚠️ Authentication Method

**Use Wallet Authentication** - This is the recommended way to authenticate users in World App mini apps. It provides access to the user's wallet address, username, and profile information.

**Do NOT use World ID Verify command for login** - World ID verification is for proof-of-personhood, not authentication.

## Database Schema

The following tables have been created in your Supabase database:

### 1. `world_id_verifications`
Stores World ID verification proofs
- `id` - UUID primary key
- `user_id` - References auth.users
- `world_id_hash` - Unique World ID
- `nullifier_hash` - Prevents duplicate verifications
- `merkle_root` - Verification proof
- `verification_level` - 'orb' or 'device'
- `verified_at` - Timestamp

### 2. `worldcoin_payments`
Tracks WLD token payments
- `id` - UUID primary key
- `user_id` - References auth.users
- `amount_wld` - Payment amount in WLD
- `transaction_hash` - Blockchain transaction
- `from_address` - Sender wallet
- `to_address` - Receiver wallet
- `network` - 'optimism' or 'world-chain'
- `status` - 'pending', 'processing', 'confirmed', 'failed'
- `credits_added` - Credits awarded
- `confirmed_at` - Confirmation timestamp

### 3. `prediction_history`
Complete history of all chart predictions
- `id` - UUID primary key
- `user_id` - References auth.users
- `timeframe` - Chart timeframe
- `chart_type` - 'candlestick', 'line', 'area'
- `recommendation` - 'LONG' or 'SHORT'
- `certainty` - Confidence percentage
- `entry_price`, `stop_loss`, `take_profit`
- `risk_reward_ratio`
- `analysis_report` - Full AI analysis
- `actual_outcome` - 'won', 'lost', 'ongoing' (optional)
- `outcome_notes` - User notes on outcome

### 4. Enhanced `user_credits`
Added tracking fields:
- `total_credits_purchased` - Lifetime purchases
- `total_credits_used` - Lifetime usage
- `last_topup_at` - Last purchase timestamp
- `last_usage_at` - Last usage timestamp

## API Endpoints

### Wallet Authentication (SIWE)

**GET** `/api/auth/nonce`

Get a nonce for SIWE message signing

Response:
```json
{
  "nonce": "a1b2c3d4e5f6g7h8..."
}
```

**POST** `/api/auth/wallet-login`

Verify wallet signature and create/login user

```json
{
  "payload": {
    "status": "success",
    "message": "...",
    "signature": "0x...",
    "address": "0x...",
    "version": 1
  },
  "nonce": "a1b2c3d4e5f6g7h8..."
}
```

Response:
```json
{
  "success": true,
  "isValid": true,
  "isNewUser": false,
  "userId": "uuid",
  "walletAddress": "0x...",
  "session": {...},
  "message": "Welcome back!"
}
```

### Worldcoin Payments

**POST** `/api/payment/worldcoin/init`

Initialize WLD payment (requires authentication)

```json
{
  "fromAddress": "0x...",
  "network": "optimism"
}
```

Response:
```json
{
  "paymentId": "uuid",
  "toAddress": "0x...",
  "amount": 0.1,
  "network": "optimism",
  "credits": 1,
  "expiresAt": "2024-01-01T00:00:00Z"
}
```

**POST** `/api/payment/worldcoin/verify`

Verify WLD payment transaction

```json
{
  "paymentId": "uuid",
  "transactionHash": "0x..."
}
```

Response:
```json
{
  "status": "confirmed",
  "message": "Payment verified successfully",
  "credits": 1,
  "transactionHash": "0x..."
}
```

### Prediction History

**GET** `/api/predictions/history?limit=50&offset=0`

Get user's prediction history (requires authentication)

Response:
```json
{
  "predictions": [
    {
      "id": "uuid",
      "recommendation": "LONG",
      "certainty": 85,
      "entry_price": "$50,000",
      "actual_outcome": "won",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "count": 50
}
```

**PATCH** `/api/predictions/:predictionId/outcome`

Update prediction outcome (requires authentication)

```json
{
  "outcome": "won",
  "notes": "Took profit at target"
}
```

## Setup Instructions

### 1. Register World ID App

1. Go to https://developer.worldcoin.org
2. Create a new app
3. Copy your `app_id`
4. Create an action: `perps-prediction-login`
5. Add these to `.env`:

```env
WORLD_ID_APP_ID=app_xxxxx
WORLD_ID_ACTION_ID=perps-prediction-login
```

### 2. Configure Worldcoin Payments

1. Get an Ethereum wallet address (MetaMask, Rainbow, etc.)
2. This wallet will receive WLD tokens on Optimism or World Chain
3. Add to `.env`:

```env
WORLDCOIN_RECEIVER_ADDRESS=0x...
WORLDCOIN_COST_WLD=0.1
```

### 3. Setup RPC URLs (Optional)

For production transaction verification:

```env
OPTIMISM_RPC_URL=https://mainnet.optimism.io
WORLD_CHAIN_RPC_URL=https://worldchain-mainnet.g.alchemy.com/v2/YOUR_KEY
```

Get free RPC endpoints from:
- Alchemy: https://alchemy.com
- Infura: https://infura.io

### 4. Frontend Integration

Install World ID SDK in your frontend:

```bash
npm install @worldcoin/idkit
```

Add to your HTML:

```html
<script src="https://cdn.jsdelivr.net/npm/@worldcoin/idkit@0.8/dist/idkit.js"></script>
```

Initialize World ID verification:

```javascript
// Initialize World ID
window.onload = function() {
  worldID.init('world-id-container', {
    app_id: 'app_xxxxx',
    action: 'perps-prediction-login',
    signal: 'user_unique_identifier',
    onSuccess: (result) => {
      // Send to your backend
      fetch('/api/auth/worldid/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result)
      });
    },
    onError: (error) => console.error(error)
  });
};
```

### 5. Payment Integration

For WLD payments, use Web3 libraries:

```javascript
// Example using ethers.js
const provider = new ethers.providers.Web3Provider(window.ethereum);
const signer = provider.getSigner();
const wldToken = new ethers.Contract(WLD_ADDRESS, WLD_ABI, signer);

// Send WLD payment
const tx = await wldToken.transfer(toAddress, ethers.utils.parseEther('0.1'));
const receipt = await tx.wait();

// Verify with backend
fetch('/api/payment/worldcoin/verify', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${userToken}`
  },
  body: JSON.stringify({
    paymentId: paymentId,
    transactionHash: receipt.transactionHash
  })
});
```

## World App Mini App

To deploy as a World App Mini App:

1. Build your frontend for mobile
2. Ensure all APIs work with CORS
3. Submit to World App Store via developer portal
4. Configure your manifest:

```json
{
  "name": "Perps Prediction",
  "description": "AI-powered crypto chart analysis",
  "icon": "https://your-app.com/icon.png",
  "url": "https://your-app.com",
  "permissions": ["worldid", "payment"]
}
```

## Token Addresses

**Worldcoin (WLD) Token:**
- Optimism Mainnet: `0xdC6fF44d5d932Cbd77B52E5612Ba0529DC6226F1`
- World Chain: Check https://worldchain.org/docs

## Testing

### Testnet Testing
1. Use World ID Simulator: https://simulator.worldcoin.org
2. Use Optimism Goerli for WLD testnet
3. Get test WLD from World ID Discord

### Local Testing
```bash
# Start your server
npm start

# Test World ID endpoint
curl -X POST http://localhost:3000/api/auth/worldid/verify \
  -H "Content-Type: application/json" \
  -d '{"proof":"test","signal":"test","action":"perps-prediction-login",...}'
```

## Production Checklist

- [ ] Register app on developer.worldcoin.org
- [ ] Set up Ethereum wallet for WLD payments
- [ ] Configure production RPC URLs
- [ ] Test World ID verification flow
- [ ] Test WLD payment flow
- [ ] Add frontend World ID SDK
- [ ] Add Web3 wallet connection
- [ ] Test prediction history
- [ ] Set up monitoring for failed payments
- [ ] Configure proper CORS for World App
- [ ] Submit to World App Store

## Support

- World ID Docs: https://docs.worldcoin.org
- World Chain Docs: https://worldchain.org/docs
- Developer Discord: https://discord.gg/worldcoin
- GitHub: Your repository

## Security Notes

1. **Never expose service role keys** - Use row-level security in Supabase
2. **Validate World ID proofs** - Always verify with Worldcoin API
3. **Check transaction confirmations** - Wait for sufficient block confirmations
4. **Rate limit endpoints** - Prevent abuse of verification/payment endpoints
5. **Secure session tokens** - Use HTTPS in production

## Next Steps

1. Test the World ID authentication flow
2. Integrate payment UI for WLD tokens
3. Add prediction history view in frontend
4. Submit app to World App Store
5. Market to World App users!
