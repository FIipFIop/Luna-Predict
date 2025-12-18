# Crypto Chart Analyzer

AI-powered cryptocurrency technical analysis tool with email authentication, credit-based payment system, and Helius API integration for Solana blockchain verification.

## Features

- **Email Authentication**: Secure user registration and login with Supabase Auth
- **Credit-Based System**: Pay-per-analysis model with Solana blockchain payments
- **Helius API Integration**: Automated payment verification via Solana blockchain
- **AI-Powered Analysis**: Technical analysis using OpenRouter's vision AI
- **Position Recommendations**: LONG/SHORT signals with certainty percentage
- **Detailed Reports**: Comprehensive analysis including entry, stop loss, and take profit levels
- **User Dashboard**: Track credits and purchase history
- **Secure Payments**: 2-minute verification window with automatic balance checking

## Prerequisites

- Node.js 18+ installed
- OpenRouter API key ([Get one here](https://openrouter.ai/keys))
- Supabase project ([Create one here](https://supabase.com))
- Helius API key for Solana blockchain ([Get one here](https://helius.dev))
- Solana wallet for receiving payments

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file from the example:

```bash
cp .env.example .env
```

Update the `.env` file with your actual values:

```env
# OpenRouter API Key (Required)
OPENROUTER_API_KEY=your_openrouter_api_key

# Supabase Configuration (Already configured)
SUPABASE_URL=https://vcawdkjknxsdshmomavn.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key

# Helius API Configuration (Required)
HELIUS_API_KEY=your_helius_api_key

# Payment Configuration (Required)
RECEIVER_WALLET_ADDRESS=your_solana_wallet_address
ANALYSIS_COST_SOL=0.01
PAYMENT_FEE_PERCENTAGE=0.20

# Optional
PORT=3000
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
```

### 3. Database Setup

The database schema has already been created with the following tables:
- `user_profiles` - User information
- `user_credits` - Credit tracking
- `payments` - Payment history and verification

Row-level security (RLS) is enabled on all tables for security.

## Running the Application

Development mode (with auto-reload):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

The application will be available at `http://localhost:3000`

## Usage

### First-Time Users

1. Open the application at `http://localhost:3000`
2. Click "Sign up" to create an account
3. Enter your email, password, and optional full name
4. Login with your credentials

### Purchasing Credits

1. Click "Buy Credits" in the top-right corner
2. Enter your Solana wallet address
3. The system will verify you have sufficient balance
4. Send the exact amount of SOL to the provided receiver address
5. Click "I've Sent the Payment"
6. Wait for verification (checked every 10 seconds for 2 minutes)
7. Credits will be added to your account automatically

### Analyzing Charts

1. Ensure you have at least 1 credit in your account
2. Select your desired timeframe from the dropdown
3. Drag and drop a crypto chart image (or click to browse)
4. Click "Analyze Chart" to get AI-powered analysis
5. Review the recommendation (LONG/SHORT), certainty percentage, and detailed report
6. One credit will be deducted per analysis

## Supported Image Formats

- PNG
- JPG/JPEG
- WEBP

Maximum file size: 10MB

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create new user account
- `POST /api/auth/login` - Login with email and password
- `POST /api/auth/logout` - Logout current user
- `GET /api/auth/user` - Get current user data and credits

### Payment
- `POST /api/payment/init` - Initialize payment and check sender balance
- `POST /api/payment/verify` - Verify payment via Helius API

### Analysis
- `POST /api/analyze` - Analyze chart image (requires authentication and credits)
- `GET /api/health` - Health check and API status

### Other
- `GET /` - Main application interface

## Deployment

### GitHub Pages

This app requires a Node.js backend and cannot be deployed to GitHub Pages directly. Consider these alternatives:

### Vercel

1. Push to GitHub
2. Import repository in Vercel
3. Add `OPENROUTER_API_KEY` environment variable
4. Deploy

### Railway / Render

1. Push to GitHub
2. Connect repository
3. Add environment variables
4. Deploy

## Security Notes

- The `.env` file is excluded from git via `.gitignore`
- Never commit your API keys
- No data is stored - all analysis is done in memory
- Images are processed in memory and not saved to disk

## Payment Flow

The payment system follows this process based on the payment logic:

1. **User Input**: User enters their Solana wallet address
2. **Balance Check**: System uses Helius API to verify sender has sufficient SOL
3. **Insufficient Funds**: If balance is too low, transaction is rejected with error message
4. **Payment Instruction**: User receives receiver wallet address and exact amount to send
5. **Manual Transfer**: User sends SOL from their wallet to the receiver address
6. **Verification Window**: 2-minute window starts when user clicks "I've Sent the Payment"
7. **Automated Checking**: System checks every 10 seconds via Helius API for the transaction
8. **Transaction Verification**: Looks for matching sender, receiver, and amount (±1% tolerance)
9. **Success**: Credits are added to user account upon successful verification
10. **Timeout**: Transaction is cancelled if not verified within 2 minutes

## Tech Stack

- **Backend**: Node.js + Express
- **Frontend**: Vanilla JavaScript (no frameworks)
- **Authentication**: Supabase Auth
- **Database**: PostgreSQL (via Supabase)
- **AI Analysis**: OpenRouter API (NVIDIA Nemotron Nano 12B Vision)
- **Blockchain**: Solana (via Helius API)
- **File Uploads**: Multer (in-memory storage)
- **Payment Verification**: Helius API for blockchain data

## License

MIT

## Disclaimer

This tool is for educational and informational purposes only. Not financial advice. Always do your own research before making trading decisions.
