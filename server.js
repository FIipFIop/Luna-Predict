import express from 'express';
import multer from 'multer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { SiweMessage } from 'siwe';
import cookieParser from 'cookie-parser';

dotenv.config();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cookieParser());
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'].includes(file.mimetype))
});

// Initialize Supabase clients
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://vcawdkjknxsdshmomavn.supabase.co',
  process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjYXdka2prbnhzZHNobW9tYXZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5NjgxMTUsImV4cCI6MjA4MTU0NDExNX0.PqaCUdtUGPvZ9esVxQX1aalpF2eQh-e-gvChxSCZ9yw'
);

// Admin client for user creation
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || 'https://vcawdkjknxsdshmomavn.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

app.use(express.json());

// Static files are handled by Vercel in production
// In development, you may want to use express.static
if (process.env.NODE_ENV !== 'production') {
  app.use(express.static(path.join(__dirname, 'public'), {
    etag: false,
    lastModified: false,
    setHeaders: (res) => {
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    }
  }));
}

// Middleware to verify JWT token from Supabase
const authenticateUser = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split(' ')[1];
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }

  req.user = user;
  next();
};

// Helper function to get wallet balance using Helius API
async function getWalletBalance(walletAddress) {
  try {
    const heliusApiKey = process.env.HELIUS_API_KEY;
    if (!heliusApiKey) {
      throw new Error('Helius API key not configured');
    }

    const response = await fetch(`https://api.helius.xyz/v0/addresses/${walletAddress}/balances?api-key=${heliusApiKey}`);

    if (!response.ok) {
      throw new Error(`Helius API error: ${response.statusText}`);
    }

    const data = await response.json();
    // Get native SOL balance (in lamports, 1 SOL = 1,000,000,000 lamports)
    const solBalance = data.nativeBalance / 1000000000;
    return solBalance;
  } catch (error) {
    console.error('Error fetching wallet balance:', error);
    throw error;
  }
}

// Helper function to verify transaction using Helius API
async function verifyTransaction(senderWallet, receiverWallet, expectedAmount) {
  try {
    const heliusApiKey = process.env.HELIUS_API_KEY;
    if (!heliusApiKey) {
      throw new Error('Helius API key not configured');
    }

    // Get recent transactions for the receiver wallet
    const response = await fetch(`https://api.helius.xyz/v0/addresses/${receiverWallet}/transactions?api-key=${heliusApiKey}&limit=10`);

    if (!response.ok) {
      throw new Error(`Helius API error: ${response.statusText}`);
    }

    const transactions = await response.json();

    // Look for a recent transaction from sender to receiver with the expected amount
    const now = Date.now();
    const twoMinutesAgo = now - (2 * 60 * 1000);

    for (const tx of transactions) {
      const txTimestamp = tx.timestamp * 1000; // Convert to milliseconds

      // Check if transaction is within the last 2 minutes
      if (txTimestamp < twoMinutesAgo) continue;

      // Check if transaction involves both sender and receiver
      const accountKeys = tx.accountData?.map(acc => acc.account) || [];
      if (!accountKeys.includes(senderWallet) || !accountKeys.includes(receiverWallet)) continue;

      // Check native transfers (SOL)
      const nativeTransfers = tx.nativeTransfers || [];
      for (const transfer of nativeTransfers) {
        if (transfer.fromUserAccount === senderWallet &&
            transfer.toUserAccount === receiverWallet) {
          const transferAmount = transfer.amount / 1000000000; // Convert lamports to SOL

          // Allow 1% tolerance for transaction fees
          const tolerance = expectedAmount * 0.01;
          if (Math.abs(transferAmount - expectedAmount) <= tolerance) {
            return {
              verified: true,
              signature: tx.signature,
              amount: transferAmount,
              timestamp: txTimestamp
            };
          }
        }
      }
    }

    return { verified: false };
  } catch (error) {
    console.error('Error verifying transaction:', error);
    throw error;
  }
}

// Telegram initData verification function
function verifyTelegramWebAppData(initData, botToken) {
  if (!initData || !botToken) return null;

  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    urlParams.delete('hash');

    const dataCheckString = Array.from(urlParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    if (calculatedHash !== hash) return null;

    // Parse user data
    const userStr = urlParams.get('user');
    return userStr ? JSON.parse(userStr) : null;
  } catch (error) {
    console.error('Telegram verification error:', error);
    return null;
  }
}

// ============= AUTHENTICATION ENDPOINTS =============

// Generate nonce for SIWE (Wallet Authentication)
app.get('/api/auth/nonce', (req, res) => {
  try {
    // Generate nonce - must be at least 8 alphanumeric characters
    const nonce = crypto.randomUUID().replace(/-/g, '');

    // Store nonce in secure cookie
    res.cookie('siwe_nonce', nonce, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 10 * 60 * 1000 // 10 minutes
    });

    res.json({ nonce });
  } catch (error) {
    console.error('Nonce generation error:', error);
    res.status(500).json({ error: 'Failed to generate nonce' });
  }
});

// Wallet Authentication (SIWE) - Primary login method for World App
app.post('/api/auth/wallet-login', async (req, res) => {
  try {
    const { payload, nonce } = req.body;

    if (!payload || !nonce) {
      return res.status(400).json({ error: 'Missing payload or nonce' });
    }

    // Verify nonce matches
    const storedNonce = req.cookies.siwe_nonce;
    if (nonce !== storedNonce) {
      return res.status(400).json({
        error: 'Invalid nonce',
        isValid: false
      });
    }

    // Verify SIWE message signature
    try {
      const siweMessage = new SiweMessage(payload.message || payload);
      const fields = await siweMessage.verify({
        signature: payload.signature,
        nonce: nonce
      });

      if (!fields.success) {
        return res.status(400).json({
          error: 'Invalid signature',
          isValid: false
        });
      }
    } catch (error) {
      console.error('SIWE verification error:', error);
      return res.status(400).json({
        error: 'Invalid signature',
        isValid: false
      });
    }

    // Extract wallet address from payload
    const walletAddress = (payload.address || payload.message?.address).toLowerCase();

    // Check if user exists
    let { data: existingUser } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('email', `${walletAddress}@worldapp.wallet`)
      .single();

    let userId;
    let isNewUser = false;

    if (!existingUser) {
      // Create new user
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: `${walletAddress}@worldapp.wallet`,
        email_confirm: true,
        user_metadata: {
          wallet_address: walletAddress,
          auth_method: 'wallet',
          world_app_user: true
        }
      });

      if (createError || !newUser.user) {
        return res.status(500).json({ error: 'Failed to create user' });
      }

      userId = newUser.user.id;
      isNewUser = true;

      // Initialize user credits
      await supabase.from('user_credits').insert({
        user_id: userId,
        credits: 0
      });

      // Create user profile
      await supabase.from('user_profiles').insert({
        id: userId,
        email: `${walletAddress}@worldapp.wallet`,
        full_name: walletAddress.substring(0, 10)
      });
    } else {
      userId = existingUser.id;
    }

    // Generate session token
    const { data: session, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: `${walletAddress}@worldapp.wallet`
    });

    if (sessionError) {
      return res.status(500).json({ error: 'Failed to create session' });
    }

    // Clear nonce cookie
    res.clearCookie('siwe_nonce');

    res.json({
      success: true,
      isValid: true,
      isNewUser,
      userId,
      walletAddress,
      session: session,
      message: isNewUser ? 'Welcome to Luna Predict!' : 'Welcome back!'
    });

  } catch (error) {
    console.error('Wallet login error:', error);
    res.status(500).json({
      error: 'Login failed',
      message: error.message,
      isValid: false
    });
  }
});

// World ID verification endpoint (DEPRECATED - Use wallet-login instead)
app.post('/api/auth/worldid/verify', async (req, res) => {
  try {
    const { proof, signal, action, nullifier_hash, merkle_root, verification_level } = req.body;

    if (!proof || !signal || !action || !nullifier_hash || !merkle_root) {
      return res.status(400).json({ error: 'Missing required World ID verification fields' });
    }

    // Verify the World ID proof with Worldcoin's API
    const verifyResponse = await fetch('https://developer.worldcoin.org/api/v1/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        proof,
        signal,
        action: action || process.env.WORLD_ID_ACTION_ID || 'login',
        app_id: process.env.WORLD_ID_APP_ID || 'app_681a53f34457fbb76319aac9d5258f5c',
        nullifier_hash,
        merkle_root,
        verification_level: verification_level || 'orb'
      })
    });

    const verifyData = await verifyResponse.json();

    if (!verifyResponse.ok || !verifyData.success) {
      return res.status(400).json({
        error: 'World ID verification failed',
        details: verifyData
      });
    }

    // Check if this World ID has been used before
    const { data: existingVerification } = await supabase
      .from('world_id_verifications')
      .select('user_id')
      .eq('nullifier_hash', nullifier_hash)
      .single();

    let userId;
    let isNewUser = false;

    if (existingVerification) {
      // User exists, return their ID
      userId = existingVerification.user_id;
    } else {
      // Create new user with World ID
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: `worldid_${nullifier_hash.substring(0, 16)}@worldapp.user`,
        email_confirm: true,
        user_metadata: {
          world_id_verified: true,
          verification_level: verification_level || 'orb',
          world_id_hash: nullifier_hash
        }
      });

      if (createError || !newUser.user) {
        return res.status(500).json({ error: 'Failed to create user', details: createError });
      }

      userId = newUser.user.id;
      isNewUser = true;

      // Store World ID verification
      await supabase.from('world_id_verifications').insert({
        user_id: userId,
        world_id_hash: signal,
        nullifier_hash,
        merkle_root,
        verification_level: verification_level || 'orb'
      });

      // Initialize user credits
      await supabase.from('user_credits').insert({
        user_id: userId,
        credits: 0
      });
    }

    // Generate session token for the user
    const { data: session, error: sessionError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: `worldid_${nullifier_hash.substring(0, 16)}@worldapp.user`,
    });

    if (sessionError) {
      return res.status(500).json({ error: 'Failed to create session', details: sessionError });
    }

    res.json({
      success: true,
      isNewUser,
      userId,
      verified: true,
      verification_level: verification_level || 'orb',
      message: isNewUser ? 'World ID verified - new account created' : 'World ID verified - welcome back'
    });

  } catch (error) {
    console.error('World ID verification error:', error);
    res.status(500).json({ error: 'World ID verification failed', message: error.message });
  }
});

// Sign up endpoint
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, fullName } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName || ''
        }
      }
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      message: 'Signup successful',
      user: data.user,
      session: data.session
    });
  } catch (error) {
    res.status(500).json({ error: 'Signup failed', message: error.message });
  }
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return res.status(401).json({ error: error.message });
    }

    res.json({
      message: 'Login successful',
      user: data.user,
      session: data.session
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed', message: error.message });
  }
});

// Logout endpoint
app.post('/api/auth/logout', authenticateUser, async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Logout successful' });
  } catch (error) {
    res.status(500).json({ error: 'Logout failed', message: error.message });
  }
});

// Get current user endpoint
app.get('/api/auth/user', authenticateUser, async (req, res) => {
  try {
    // Get user credits
    const { data: creditsData, error: creditsError } = await supabase
      .from('user_credits')
      .select('credits')
      .eq('user_id', req.user.id)
      .single();

    if (creditsError) {
      console.error('Error fetching credits:', creditsError);
    }

    res.json({
      user: req.user,
      credits: creditsData?.credits || 0
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user data', message: error.message });
  }
});

// ============= PAYMENT ENDPOINTS =============

// Initialize payment (Step 1: User provides sender wallet)
app.post('/api/payment/init', authenticateUser, async (req, res) => {
  try {
    const { senderWallet } = req.body;

    if (!senderWallet) {
      return res.status(400).json({ error: 'Sender wallet address is required' });
    }

    const receiverWallet = process.env.RECEIVER_WALLET_ADDRESS;
    const analysisCost = parseFloat(process.env.ANALYSIS_COST_SOL || '0.01');

    if (!receiverWallet) {
      return res.status(500).json({ error: 'Receiver wallet not configured' });
    }

    // Check sender wallet balance using Helius API
    let senderBalance;
    try {
      senderBalance = await getWalletBalance(senderWallet);
    } catch (error) {
      return res.status(400).json({ error: 'Failed to verify sender wallet balance' });
    }

    if (senderBalance < analysisCost) {
      return res.status(400).json({
        error: 'Insufficient funds',
        message: `Sender wallet has ${senderBalance.toFixed(4)} SOL, but ${analysisCost} SOL is required`,
        required: analysisCost,
        available: senderBalance
      });
    }

    // Create payment record
    const { data: payment, error } = await supabase
      .from('payments')
      .insert({
        user_id: req.user.id,
        sender_wallet: senderWallet,
        receiver_wallet: receiverWallet,
        amount: 0,
        expected_amount: analysisCost,
        status: 'pending',
        credits_added: 1
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating payment:', error);
      return res.status(500).json({ error: 'Failed to initialize payment' });
    }

    res.json({
      paymentId: payment.id,
      receiverWallet,
      amount: analysisCost,
      senderBalance,
      expiresAt: payment.expires_at
    });
  } catch (error) {
    res.status(500).json({ error: 'Payment initialization failed', message: error.message });
  }
});

// Verify payment (Step 2: Check if payment was sent)
app.post('/api/payment/verify', authenticateUser, async (req, res) => {
  try {
    const { paymentId } = req.body;

    if (!paymentId) {
      return res.status(400).json({ error: 'Payment ID is required' });
    }

    // Get payment record
    const { data: payment, error: fetchError } = await supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .eq('user_id', req.user.id)
      .single();

    if (fetchError || !payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Check if payment already verified
    if (payment.status === 'verified') {
      return res.json({
        status: 'verified',
        message: 'Payment already verified',
        credits: 1
      });
    }

    // Check if payment expired
    const now = new Date();
    const expiresAt = new Date(payment.expires_at);
    if (now > expiresAt) {
      await supabase
        .from('payments')
        .update({ status: 'cancelled' })
        .eq('id', paymentId);

      return res.status(400).json({
        status: 'cancelled',
        error: 'Payment verification window expired (2 minutes)'
      });
    }

    // Verify transaction using Helius API
    let verification;
    try {
      verification = await verifyTransaction(
        payment.sender_wallet,
        payment.receiver_wallet,
        payment.expected_amount
      );
    } catch (error) {
      return res.status(500).json({ error: 'Failed to verify transaction with Helius API' });
    }

    if (!verification.verified) {
      return res.json({
        status: 'pending',
        message: 'Transaction not yet confirmed. Please wait...',
        expiresAt: payment.expires_at
      });
    }

    // Update payment record
    const { error: updateError } = await supabase
      .from('payments')
      .update({
        status: 'verified',
        amount: verification.amount,
        transaction_signature: verification.signature,
        verified_at: new Date(verification.timestamp).toISOString()
      })
      .eq('id', paymentId);

    if (updateError) {
      console.error('Error updating payment:', updateError);
      return res.status(500).json({ error: 'Failed to update payment status' });
    }

    // Add credits to user
    const { error: creditsError } = await supabase.rpc('increment_credits', {
      p_user_id: req.user.id,
      p_amount: payment.credits_added
    });

    // If RPC doesn't exist, do it manually
    if (creditsError) {
      const { data: currentCredits } = await supabase
        .from('user_credits')
        .select('credits')
        .eq('user_id', req.user.id)
        .single();

      await supabase
        .from('user_credits')
        .update({ credits: (currentCredits?.credits || 0) + payment.credits_added })
        .eq('user_id', req.user.id);
    }

    res.json({
      status: 'verified',
      message: 'Payment verified successfully',
      credits: payment.credits_added,
      transactionSignature: verification.signature
    });
  } catch (error) {
    res.status(500).json({ error: 'Payment verification failed', message: error.message });
  }
});

// ============= WORLDCOIN PAYMENT ENDPOINTS =============

// Initialize Worldcoin payment
app.post('/api/payment/worldcoin/init', authenticateUser, async (req, res) => {
  try {
    const { fromAddress, network } = req.body;

    if (!fromAddress) {
      return res.status(400).json({ error: 'From address is required' });
    }

    const validNetworks = ['optimism', 'world-chain'];
    const paymentNetwork = network || 'world-chain'; // Default to World Chain

    if (!validNetworks.includes(paymentNetwork)) {
      return res.status(400).json({ error: 'Invalid network. Use "optimism" or "world-chain"' });
    }

    // Payment configuration
    const toAddress = process.env.WORLDCOIN_RECEIVER_ADDRESS || process.env.RECEIVER_WALLET_ADDRESS;
    const amountWLD = parseFloat(process.env.WORLDCOIN_COST_WLD || '10'); // Default 10 WLD
    const creditsToAdd = parseInt(process.env.WORLDCOIN_CREDITS_PER_PAYMENT || '5'); // Default 5 credits

    if (!toAddress) {
      return res.status(500).json({ error: 'Receiver address not configured' });
    }

    // Create payment record
    const { data: payment, error } = await supabase
      .from('worldcoin_payments')
      .insert({
        user_id: req.user.id,
        amount_wld: amountWLD,
        from_address: fromAddress,
        to_address: toAddress,
        network: paymentNetwork,
        status: 'pending',
        credits_added: creditsToAdd
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating worldcoin payment:', error);
      return res.status(500).json({ error: 'Failed to initialize payment' });
    }

    res.json({
      paymentId: payment.id,
      toAddress,
      fromAddress,
      amount: amountWLD,
      network: paymentNetwork,
      credits: creditsToAdd,
      expiresAt: payment.expires_at
    });

  } catch (error) {
    console.error('Worldcoin payment init error:', error);
    res.status(500).json({ error: 'Payment initialization failed', message: error.message });
  }
});

// Verify Worldcoin payment
app.post('/api/payment/worldcoin/verify', authenticateUser, async (req, res) => {
  try {
    const { paymentId, transactionHash } = req.body;

    if (!paymentId) {
      return res.status(400).json({ error: 'Payment ID is required' });
    }

    // Get payment record
    const { data: payment, error: fetchError } = await supabase
      .from('worldcoin_payments')
      .select('*')
      .eq('id', paymentId)
      .eq('user_id', req.user.id)
      .single();

    if (fetchError || !payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Check if payment already confirmed
    if (payment.status === 'confirmed') {
      return res.json({
        status: 'confirmed',
        message: 'Payment already confirmed',
        credits: payment.credits_added
      });
    }

    // Check if payment expired
    const now = new Date();
    const expiresAt = new Date(payment.expires_at);
    if (now > expiresAt) {
      await supabase
        .from('worldcoin_payments')
        .update({ status: 'failed' })
        .eq('id', paymentId);

      return res.status(400).json({
        status: 'failed',
        error: 'Payment verification window expired'
      });
    }

    // If transaction hash provided, verify on blockchain
    if (transactionHash) {
      // Update payment with transaction hash
      await supabase
        .from('worldcoin_payments')
        .update({
          transaction_hash: transactionHash,
          status: 'processing'
        })
        .eq('id', paymentId);

      // In production, you would verify the transaction on Optimism/World Chain
      // For now, we'll use a simplified verification
      try {
        const rpcUrl = payment.network === 'world-chain'
          ? process.env.WORLD_CHAIN_RPC_URL || 'https://worldchain-mainnet.g.alchemy.com/v2/demo'
          : process.env.OPTIMISM_RPC_URL || 'https://mainnet.optimism.io';

        const txCheckResponse = await fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_getTransactionByHash',
            params: [transactionHash],
            id: 1
          })
        });

        const txData = await txCheckResponse.json();

        if (txData.result) {
          // Transaction exists, mark as confirmed
          await supabase
            .from('worldcoin_payments')
            .update({
              status: 'confirmed',
              confirmed_at: new Date().toISOString(),
              block_number: parseInt(txData.result.blockNumber, 16)
            })
            .eq('id', paymentId);

          // Add credits to user
          const { error: creditsError } = await supabase.rpc('increment_credits', {
            p_user_id: req.user.id,
            p_amount: payment.credits_added
          });

          if (creditsError) {
            const { data: currentCredits } = await supabase
              .from('user_credits')
              .select('credits')
              .eq('user_id', req.user.id)
              .single();

            await supabase
              .from('user_credits')
              .update({ credits: (currentCredits?.credits || 0) + payment.credits_added })
              .eq('user_id', req.user.id);
          }

          return res.json({
            status: 'confirmed',
            message: 'Payment verified successfully',
            credits: payment.credits_added,
            transactionHash
          });
        }
      } catch (verifyError) {
        console.error('Transaction verification error:', verifyError);
        // Continue to pending status if verification fails
      }
    }

    res.json({
      status: 'pending',
      message: 'Waiting for transaction confirmation',
      expiresAt: payment.expires_at
    });

  } catch (error) {
    console.error('Worldcoin payment verification error:', error);
    res.status(500).json({ error: 'Payment verification failed', message: error.message });
  }
});

// Analyze chart endpoint (requires authentication and credits)
app.post('/api/analyze', authenticateUser, upload.single('chart'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No chart image provided' });
    if (!req.body.timeframe) return res.status(400).json({ error: 'Timeframe is required' });
    if (!process.env.OPENROUTER_API_KEY) return res.status(500).json({ error: 'API key not configured' });

    // Check if user has credits
    const { data: creditsData, error: creditsError } = await supabase
      .from('user_credits')
      .select('credits')
      .eq('user_id', req.user.id)
      .single();

    if (creditsError || !creditsData) {
      return res.status(500).json({ error: 'Failed to fetch user credits' });
    }

    if (creditsData.credits < 1) {
      return res.status(402).json({
        error: 'Insufficient credits',
        message: 'You need to purchase credits to analyze charts',
        credits: creditsData.credits
      });
    }

    const imageUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

    // Build AI prompt based on timeframe mode
    const isAutoDetect = req.body.timeframe === 'auto';
    const timeframeText = isAutoDetect
      ? 'Determine the timeframe from the chart (look for labels, time intervals, or date ranges visible)'
      : `${req.body.timeframe} timeframe`;

    const prompt = isAutoDetect
      ? `Analyze this crypto chart and detect its timeframe. IMPORTANT: This could be a CANDLESTICK chart (TradingView/exchanges) OR a LINE/AREA chart from Phantom wallet or other crypto wallets.

TIMEFRAME DETECTION STRATEGY:
1. For Phantom wallet charts (smooth line/area): Check top of chart for timeframe buttons/labels (1H, 1D, 1W, 1M, ALL)
2. For all charts: Look at X-axis time labels and calculate spacing between data points
3. Date range method: If you see "Jan 1 - Jan 7" = likely 1H/4H/1D depending on point density
4. Candle spacing: Wide gaps = higher timeframe (1D/1W), tight = lower (1m/5m/15m/1H)

CHART TYPE IDENTIFICATION:
- Candlestick: Red/green bars with wicks (TradingView, Binance, Coinbase Pro)
- Line: Smooth colored line (Phantom wallet, Trust Wallet, MetaMask)
- Area: Filled gradient under line (Phantom wallet default)

ANALYSIS FOR LINE CHARTS (Phantom wallet):
- Identify trend from line direction and slope
- Find support/resistance at previous price levels where line bounced
- Look for breakouts above/below historical levels
- Consider volume (if visible) at key price points

Respond ONLY with valid JSON: {"timeframe":"1m/5m/15m/30m/1h/4h/1d/1w/1M","timeframeConfidence":"high/medium/low","chartType":"candlestick/line/area","recommendation":"LONG/SHORT","certainty":85,"entryPrice":"$X (desc)","stopLoss":"$X (-X%)","takeProfit":"$X (+X%)","riskRewardRatio":"X:1","report":"Detailed analysis with patterns, trend direction, support/resistance levels, and SL/TP justification"}. Min 2:1 R:R required.`
      : `Analyze this ${req.body.timeframe} crypto chart. IMPORTANT: This could be a candlestick chart OR a line/area chart from Phantom wallet.

ANALYSIS APPROACH:
For CANDLESTICK charts: Use traditional technical analysis (patterns, support/resistance, candle formations)
For LINE/AREA charts (Phantom wallet): Focus on trend direction, price levels, breakouts, and historical bounces

KEY POINTS FOR PHANTOM WALLET CHARTS:
- Smooth line = trend is more important than individual candles
- Support/resistance at previous price levels where line bounced or reversed
- Breakouts above resistance or below support are strong signals
- Consider overall trend strength (steep vs gradual slope)

Respond ONLY with valid JSON: {"recommendation":"LONG/SHORT","certainty":85,"entryPrice":"$X (desc)","stopLoss":"$X (-X%)","takeProfit":"$X (+X%)","riskRewardRatio":"X:1","report":"Detailed analysis identifying chart type, trend direction, key support/resistance levels, and trade rationale"}. Min 2:1 R:R required.`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'nvidia/nemotron-nano-12b-v2-vl:free',
        messages: [{
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: imageUrl } },
            { type: 'text', text: prompt }
          ]
        }],
        temperature: 0.7,
        max_tokens: 1500
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API error:', response.status, errorText);
      return res.status(response.status).json({ error: 'Failed to analyze chart' });
    }

    const apiResponse = await response.json();
    console.log('OpenRouter API response:', JSON.stringify(apiResponse).substring(0, 200));

    const content = apiResponse.choices?.[0]?.message?.content;
    if (!content) {
      console.error('No content in API response:', apiResponse);
      return res.status(500).json({
        error: 'No response from AI',
        message: 'The AI did not return a valid response. Please try again.'
      });
    }

    let analysis;
    try {
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/\{[\s\S]*\}/);
      analysis = JSON.parse(jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content);
    } catch (e) {
      analysis = {
        recommendation: content.toUpperCase().includes('LONG') ? 'LONG' : 'SHORT',
        certainty: 75,
        entryPrice: 'See report',
        stopLoss: 'See report',
        takeProfit: 'See report',
        riskRewardRatio: '2:1',
        report: content
      };
    }

    // Deduct 1 credit from user
    await supabase
      .from('user_credits')
      .update({ credits: creditsData.credits - 1 })
      .eq('user_id', req.user.id);

    // Save prediction to history
    const predictionData = {
      user_id: req.user.id,
      timeframe: analysis.timeframe || req.body.timeframe,
      chart_type: analysis.chartType || 'candlestick',
      recommendation: analysis.recommendation || 'N/A',
      certainty: analysis.certainty || 0,
      entry_price: analysis.entryPrice || 'Not specified',
      stop_loss: analysis.stopLoss || 'Not specified',
      take_profit: analysis.takeProfit || 'Not specified',
      risk_reward_ratio: analysis.riskRewardRatio || 'N/A',
      analysis_report: analysis.report || content,
      credits_used: 1
    };

    const { data: savedPrediction, error: predictionError } = await supabase
      .from('prediction_history')
      .insert(predictionData)
      .select()
      .single();

    if (predictionError) {
      console.error('Error saving prediction to history:', predictionError);
    }

    res.json({
      predictionId: savedPrediction?.id,
      recommendation: analysis.recommendation || 'N/A',
      certainty: analysis.certainty || 0,
      entryPrice: analysis.entryPrice || 'Not specified',
      stopLoss: analysis.stopLoss || 'Not specified',
      takeProfit: analysis.takeProfit || 'Not specified',
      riskRewardRatio: analysis.riskRewardRatio || 'N/A',
      report: analysis.report || content,
      timeframe: analysis.timeframe || req.body.timeframe,
      timeframeConfidence: analysis.timeframeConfidence || 'high',
      chartType: analysis.chartType || 'candlestick',
      creditsRemaining: creditsData.credits - 1,
      disclaimer: '⚠️ IMPORTANT: This is AI-generated analysis for educational purposes only. You MUST set your own Stop Loss and Take Profit levels. We recommend a minimum 1% TP. Never risk more than you can afford to lose. This is NOT financial advice. Always DYOR.'
    });

  } catch (error) {
    res.status(500).json({ error: 'Failed to analyze chart', message: error.message });
  }
});

// ============= PREDICTION HISTORY ENDPOINTS =============

// Get user's prediction history
app.get('/api/predictions/history', authenticateUser, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const { data: predictions, error } = await supabase
      .from('prediction_history')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching prediction history:', error);
      return res.status(500).json({ error: 'Failed to fetch prediction history' });
    }

    res.json({
      predictions: predictions || [],
      count: predictions?.length || 0
    });

  } catch (error) {
    console.error('Get prediction history error:', error);
    res.status(500).json({ error: 'Failed to fetch predictions', message: error.message });
  }
});

// Update prediction outcome
app.patch('/api/predictions/:predictionId/outcome', authenticateUser, async (req, res) => {
  try {
    const { predictionId } = req.params;
    const { outcome, notes } = req.body;

    if (!outcome || !['won', 'lost', 'ongoing'].includes(outcome)) {
      return res.status(400).json({ error: 'Invalid outcome. Must be "won", "lost", or "ongoing"' });
    }

    const { data: prediction, error } = await supabase
      .from('prediction_history')
      .update({
        actual_outcome: outcome,
        outcome_notes: notes || null,
        outcome_updated_at: new Date().toISOString()
      })
      .eq('id', predictionId)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating prediction outcome:', error);
      return res.status(500).json({ error: 'Failed to update prediction outcome' });
    }

    if (!prediction) {
      return res.status(404).json({ error: 'Prediction not found' });
    }

    res.json({
      message: 'Prediction outcome updated successfully',
      prediction
    });

  } catch (error) {
    console.error('Update prediction outcome error:', error);
    res.status(500).json({ error: 'Failed to update outcome', message: error.message });
  }
});

app.get('/api/health', (req, res) => res.json({ status: 'ok', apiConfigured: !!process.env.OPENROUTER_API_KEY }));

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

if (process.env.NODE_ENV !== 'production') {
  app.listen(process.env.PORT || 3000, () => console.log('🚀 Server running on port', process.env.PORT || 3000));
}

export default app;
