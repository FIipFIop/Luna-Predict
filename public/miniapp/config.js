/**
 * World Pay Mini App Configuration
 *
 * ⚠️ IMPORTANT: Update these values with your own credentials
 */

const WORLDPAY_CONFIG = {
  // World ID Configuration
  // Get these from: https://developer.worldcoin.org/
  worldId: {
    appId: 'app_681a53f34457fbb76319aac9d5258f5c', // ⚠️ INSERT YOUR APP ID
    actionId: 'login', // ⚠️ INSERT YOUR ACTION ID (e.g., 'login', 'verify', etc.)
  },

  // Payment Configuration
  payment: {
    merchantAddress: '0xc7ef2767a8226c0afaf70e328c6922420ad8ab2a', // Your Ethereum wallet for receiving WLD
    defaultNetwork: 'world-chain', // 'world-chain' or 'optimism'
  },

  // Network Configuration
  networks: {
    'world-chain': {
      id: '480',
      name: 'World Chain',
      rpcUrl: 'https://worldchain-mainnet.g.alchemy.com/v2/demo',
      wldToken: '0x2cFc85d8E48F8EAB294be644d9E25C3030863003',
      explorer: 'https://worldchain-mainnet.explorer.alchemy.com',
      gasFeeFree: true
    },
    'optimism': {
      id: '10',
      name: 'Optimism',
      rpcUrl: 'https://mainnet.optimism.io',
      wldToken: '0xdC6fF44d5d932Cbd77B52E5612Ba0529DC6226F1',
      explorer: 'https://optimistic.etherscan.io',
      gasFeeFree: false
    }
  },

  // API Configuration
  api: {
    baseUrl: window.location.origin,
    endpoints: {
      nonce: '/api/auth/nonce',
      walletLogin: '/api/auth/wallet-login',
      verifyPayment: '/api/payment/worldcoin/verify'
    }
  },

  // UI Configuration
  ui: {
    appName: 'World Pay',
    appIcon: '🌍',
    theme: {
      primary: '#bd00ff',
      primaryDark: '#9900cc',
      primaryLight: '#d94dff',
      success: '#00ff88'
    }
  }
};

// Freeze config to prevent accidental modifications
Object.freeze(WORLDPAY_CONFIG);
