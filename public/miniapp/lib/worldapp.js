/**
 * World App Integration Library
 * Wrapper utilities for MiniKit and IDKit
 */

class WorldAppSDK {
  constructor() {
    this.minikit = null;
    this.initialized = false;
    this.user = null;
  }

  /**
   * Initialize MiniKit SDK
   */
  async init() {
    if (this.initialized) return;

    try {
      // Wait for MiniKit to be available
      if (typeof MiniKit === 'undefined') {
        throw new Error('MiniKit SDK not loaded');
      }

      // Install MiniKit
      await MiniKit.install();
      this.minikit = MiniKit;
      this.initialized = true;

      console.log('✅ World App SDK initialized');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize World App SDK:', error);
      throw error;
    }
  }

  /**
   * Verify with World ID using IDKit
   * @param {Object} options - Verification options
   * @returns {Promise<Object>} Verification proof
   */
  async verifyWithWorldID(options = {}) {
    return new Promise((resolve, reject) => {
      const {
        app_id = WORLDPAY_CONFIG.worldId.appId,
        action = WORLDPAY_CONFIG.worldId.actionId,
        signal = '',
        onSuccess = null,
        onError = null
      } = options;

      // Configure IDKit
      window.idkit = {
        app_id,
        action,
        signal,
        onSuccess: (proof) => {
          console.log('✅ World ID verification successful');
          if (onSuccess) onSuccess(proof);
          resolve(proof);
        },
        onError: (error) => {
          console.error('❌ World ID verification failed:', error);
          if (onError) onError(error);
          reject(error);
        }
      };

      // Trigger IDKit modal
      if (typeof worldID !== 'undefined') {
        worldID.init(window.idkit);
      } else {
        reject(new Error('IDKit not loaded'));
      }
    });
  }

  /**
   * Sign in with World App wallet (SIWE)
   * @param {string} nonce - Server-generated nonce
   * @returns {Promise<Object>} SIWE payload
   */
  async walletAuth(nonce) {
    if (!this.initialized) {
      await this.init();
    }

    try {
      const expirationTime = new Date();
      expirationTime.setDate(expirationTime.getDate() + 7); // 7 days

      const { commandPayload, finalPayload } = await this.minikit.commandsAsync.walletAuth({
        nonce,
        requestId: '0', // Unique request ID
        expirationTime,
        statement: 'Sign in to World Pay - Secure payments with World ID',
        notBefore: new Date(new Date().getTime() - 24 * 60 * 60 * 1000)
      });

      if (finalPayload.status === 'error') {
        throw new Error(finalPayload.error || 'Wallet authentication failed');
      }

      console.log('✅ Wallet authentication successful');
      return finalPayload;
    } catch (error) {
      console.error('❌ Wallet authentication failed:', error);
      throw error;
    }
  }

  /**
   * Send WLD payment
   * @param {Object} paymentData - Payment details
   * @returns {Promise<Object>} Payment result
   */
  async sendPayment(paymentData) {
    if (!this.initialized) {
      await this.init();
    }

    const {
      to,
      value,
      network = 'world-chain', // 'world-chain' or 'optimism'
      description = ''
    } = paymentData;

    try {
      // Convert WLD amount to wei (18 decimals)
      const valueInWei = (parseFloat(value) * Math.pow(10, 18)).toString();

      // Network IDs
      const networkId = network === 'world-chain' ? '480' : '10'; // World Chain: 480, Optimism: 10

      const { commandPayload, finalPayload } = await this.minikit.commandsAsync.pay({
        to,
        value: valueInWei,
        network: networkId,
        description
      });

      if (finalPayload.status === 'error') {
        throw new Error(finalPayload.error || 'Payment failed');
      }

      console.log('✅ Payment sent successfully');
      return finalPayload;
    } catch (error) {
      console.error('❌ Payment failed:', error);
      throw error;
    }
  }

  /**
   * Get user wallet address
   * @returns {string|null} Wallet address
   */
  getUserAddress() {
    return this.user?.address || null;
  }

  /**
   * Set user data
   * @param {Object} userData - User information
   */
  setUser(userData) {
    this.user = userData;
    localStorage.setItem('worldapp_user', JSON.stringify(userData));
  }

  /**
   * Get user data from storage
   * @returns {Object|null} User data
   */
  getUser() {
    if (this.user) return this.user;

    const stored = localStorage.getItem('worldapp_user');
    if (stored) {
      this.user = JSON.parse(stored);
      return this.user;
    }

    return null;
  }

  /**
   * Clear user session
   */
  logout() {
    this.user = null;
    localStorage.removeItem('worldapp_user');
    localStorage.removeItem('worldapp_session');
    console.log('✅ User logged out');
  }

  /**
   * Check if user is authenticated
   * @returns {boolean}
   */
  isAuthenticated() {
    return !!this.getUser();
  }
}

// Create singleton instance
const worldApp = new WorldAppSDK();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    worldApp.init().catch(console.error);
  });
} else {
  worldApp.init().catch(console.error);
}
