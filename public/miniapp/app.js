/**
 * World Pay Mini App
 * Main application logic
 */

// API Configuration (from config.js)
const API_BASE = WORLDPAY_CONFIG.api.baseUrl;
const MERCHANT_ADDRESS = WORLDPAY_CONFIG.payment.merchantAddress;

// App State
const state = {
  currentScreen: 'signIn',
  user: null,
  balance: 0,
  transactions: [],
  selectedFilter: 'all'
};

// DOM Elements
const screens = {
  signIn: document.getElementById('signInScreen'),
  dashboard: document.getElementById('dashboardScreen'),
  payment: document.getElementById('paymentScreen'),
  history: document.getElementById('historyScreen')
};

const elements = {
  // Sign In
  signInBtn: document.getElementById('signInBtn'),
  signInError: document.getElementById('signInError'),

  // Dashboard
  userNullifier: document.getElementById('userNullifier'),
  balanceAmount: document.getElementById('balanceAmount'),
  totalTransactions: document.getElementById('totalTransactions'),
  totalSpent: document.getElementById('totalSpent'),
  logoutBtn: document.getElementById('logoutBtn'),
  payBtn: document.getElementById('payBtn'),
  historyBtn: document.getElementById('historyBtn'),

  // Payment
  paymentAmount: document.getElementById('paymentAmount'),
  recipientAddress: document.getElementById('recipientAddress'),
  paymentDescription: document.getElementById('paymentDescription'),
  summaryAmount: document.getElementById('summaryAmount'),
  summaryTotal: document.getElementById('summaryTotal'),
  confirmPaymentBtn: document.getElementById('confirmPaymentBtn'),
  backFromPaymentBtn: document.getElementById('backFromPaymentBtn'),
  paymentStatus: document.getElementById('paymentStatus'),

  // History
  transactionList: document.getElementById('transactionList'),
  emptyState: document.getElementById('emptyState'),
  backFromHistoryBtn: document.getElementById('backFromHistoryBtn'),

  // Loading
  loadingOverlay: document.getElementById('loadingOverlay'),
  loadingText: document.getElementById('loadingText')
};

// Initialize App
async function init() {
  console.log('🚀 Initializing World Pay Mini App...');

  // Set merchant address
  elements.recipientAddress.value = MERCHANT_ADDRESS;

  // Check if user is already authenticated
  const user = worldApp.getUser();
  if (user) {
    state.user = user;
    await loadDashboard();
    showScreen('dashboard');
  }

  // Setup event listeners
  setupEventListeners();

  // Load transactions from storage
  loadTransactions();

  console.log('✅ App initialized');
}

// Setup Event Listeners
function setupEventListeners() {
  // Sign In
  elements.signInBtn.addEventListener('click', handleSignIn);

  // Dashboard
  elements.logoutBtn.addEventListener('click', handleLogout);
  elements.payBtn.addEventListener('click', () => showScreen('payment'));
  elements.historyBtn.addEventListener('click', () => {
    showScreen('history');
    renderTransactions();
  });

  // Payment
  elements.backFromPaymentBtn.addEventListener('click', () => showScreen('dashboard'));
  elements.confirmPaymentBtn.addEventListener('click', handlePayment);
  elements.paymentAmount.addEventListener('input', updatePaymentSummary);

  // History
  elements.backFromHistoryBtn.addEventListener('click', () => showScreen('dashboard'));

  // Filter tabs
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      e.target.classList.add('active');
      state.selectedFilter = e.target.dataset.filter;
      renderTransactions();
    });
  });

  // Network selection
  document.querySelectorAll('input[name="network"]').forEach(radio => {
    radio.addEventListener('change', updatePaymentSummary);
  });
}

// Screen Navigation
function showScreen(screenName) {
  Object.keys(screens).forEach(name => {
    screens[name].classList.remove('active');
  });
  screens[screenName].classList.add('active');
  state.currentScreen = screenName;
}

// Loading Overlay
function showLoading(message = 'Processing...') {
  elements.loadingText.textContent = message;
  elements.loadingOverlay.classList.remove('hidden');
}

function hideLoading() {
  elements.loadingOverlay.classList.add('hidden');
}

// Sign In with World ID
async function handleSignIn() {
  try {
    showLoading('Signing in with World ID...');
    elements.signInError.classList.add('hidden');

    // Step 1: Get nonce from server
    const nonceRes = await fetch(`${API_BASE}/api/auth/nonce`, {
      credentials: 'include'
    });
    const { nonce } = await nonceRes.json();

    // Step 2: Perform wallet authentication
    const payload = await worldApp.walletAuth(nonce);

    // Step 3: Verify with backend
    const loginRes = await fetch(`${API_BASE}/api/auth/wallet-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ payload, nonce })
    });

    if (!loginRes.ok) {
      throw new Error('Login failed');
    }

    const userData = await loginRes.json();

    // Save user data
    state.user = userData;
    worldApp.setUser(userData);

    // Load dashboard and show it
    await loadDashboard();
    showScreen('dashboard');

    hideLoading();
  } catch (error) {
    hideLoading();
    console.error('Sign in error:', error);
    elements.signInError.textContent = error.message || 'Sign in failed. Please try again.';
    elements.signInError.classList.remove('hidden');
  }
}

// Logout
function handleLogout() {
  worldApp.logout();
  state.user = null;
  state.transactions = [];
  showScreen('signIn');
}

// Load Dashboard Data
async function loadDashboard() {
  try {
    // Display user info
    if (state.user?.address) {
      elements.userNullifier.textContent = `${state.user.address.slice(0, 6)}...${state.user.address.slice(-4)}`;
    }

    // Fetch balance
    await fetchBalance();

    // Update stats
    updateDashboardStats();
  } catch (error) {
    console.error('Error loading dashboard:', error);
  }
}

// Fetch WLD Balance
async function fetchBalance() {
  try {
    showLoading('Fetching balance...');

    const network = WORLDPAY_CONFIG.payment.defaultNetwork;
    const networkConfig = WORLDPAY_CONFIG.networks[network];
    const rpcUrl = networkConfig.rpcUrl;
    const WLD_TOKEN = networkConfig.wldToken;

    // Fetch balance using JSON-RPC
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [{
          to: WLD_TOKEN,
          data: `0x70a08231000000000000000000000000${state.user.address.slice(2)}`
        }, 'latest'],
        id: 1
      })
    });

    const data = await response.json();

    if (data.result) {
      // Convert from wei to WLD (18 decimals)
      const balanceWei = BigInt(data.result);
      const balanceWLD = Number(balanceWei) / Math.pow(10, 18);
      state.balance = balanceWLD;
      elements.balanceAmount.textContent = balanceWLD.toFixed(2);
    } else {
      elements.balanceAmount.textContent = '0.00';
    }

    hideLoading();
  } catch (error) {
    console.error('Error fetching balance:', error);
    elements.balanceAmount.textContent = 'Error';
    hideLoading();
  }
}

// Update Dashboard Stats
function updateDashboardStats() {
  const successTransactions = state.transactions.filter(t => t.status === 'success');
  elements.totalTransactions.textContent = successTransactions.length;

  const totalSpent = successTransactions.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
  elements.totalSpent.textContent = totalSpent.toFixed(2);
}

// Update Payment Summary
function updatePaymentSummary() {
  const amount = parseFloat(elements.paymentAmount.value) || 0;
  elements.summaryAmount.textContent = `${amount.toFixed(2)} WLD`;
  elements.summaryTotal.textContent = `${amount.toFixed(2)} WLD`;
}

// Handle Payment
async function handlePayment() {
  try {
    const amount = parseFloat(elements.paymentAmount.value);
    const recipient = elements.recipientAddress.value;
    const description = elements.paymentDescription.value || 'World Pay payment';
    const network = document.querySelector('input[name="network"]:checked').value;

    // Validation
    if (!amount || amount <= 0) {
      throw new Error('Please enter a valid amount');
    }

    if (!recipient || !recipient.startsWith('0x')) {
      throw new Error('Invalid recipient address');
    }

    showLoading('Processing payment...');
    elements.paymentStatus.classList.add('hidden');

    // Step 1: Send payment via MiniKit
    const paymentResult = await worldApp.sendPayment({
      to: recipient,
      value: amount,
      network,
      description
    });

    // Step 2: Verify payment on backend
    const verifyRes = await fetch(`${API_BASE}/api/payment/worldcoin/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        transactionId: paymentResult.transaction_id,
        amount,
        network
      })
    });

    if (!verifyRes.ok) {
      throw new Error('Payment verification failed');
    }

    // Step 3: Save transaction
    const transaction = {
      id: paymentResult.transaction_id || Date.now().toString(),
      amount: amount.toString(),
      recipient,
      description,
      network,
      status: 'success',
      timestamp: new Date().toISOString(),
      hash: paymentResult.transaction_id
    };

    state.transactions.unshift(transaction);
    saveTransactions();

    // Show success
    elements.paymentStatus.textContent = '✅ Payment sent successfully!';
    elements.paymentStatus.classList.remove('hidden');
    elements.paymentStatus.classList.add('status-message');
    elements.paymentStatus.classList.remove('error-message');

    // Clear form
    elements.paymentAmount.value = '';
    elements.paymentDescription.value = '';
    updatePaymentSummary();

    // Update balance and stats
    await fetchBalance();
    updateDashboardStats();

    hideLoading();

    // Return to dashboard after 2 seconds
    setTimeout(() => {
      showScreen('dashboard');
      elements.paymentStatus.classList.add('hidden');
    }, 2000);

  } catch (error) {
    hideLoading();
    console.error('Payment error:', error);

    elements.paymentStatus.textContent = `❌ ${error.message || 'Payment failed'}`;
    elements.paymentStatus.classList.remove('hidden');
    elements.paymentStatus.classList.add('error-message');
    elements.paymentStatus.classList.remove('status-message');

    // Save failed transaction
    const failedTransaction = {
      id: Date.now().toString(),
      amount: elements.paymentAmount.value,
      recipient: elements.recipientAddress.value,
      description: elements.paymentDescription.value || 'Payment',
      network: document.querySelector('input[name="network"]:checked').value,
      status: 'failed',
      timestamp: new Date().toISOString(),
      error: error.message
    };

    state.transactions.unshift(failedTransaction);
    saveTransactions();
  }
}

// Transaction Storage
function saveTransactions() {
  localStorage.setItem('worldpay_transactions', JSON.stringify(state.transactions));
}

function loadTransactions() {
  const stored = localStorage.getItem('worldpay_transactions');
  if (stored) {
    state.transactions = JSON.parse(stored);
  }
}

// Render Transactions
function renderTransactions() {
  const filtered = state.selectedFilter === 'all'
    ? state.transactions
    : state.transactions.filter(t => t.status === state.selectedFilter);

  if (filtered.length === 0) {
    elements.transactionList.innerHTML = '';
    elements.emptyState.classList.remove('hidden');
    return;
  }

  elements.emptyState.classList.add('hidden');

  elements.transactionList.innerHTML = filtered.map(tx => `
    <div class="transaction-item">
      <div class="transaction-header">
        <div class="transaction-amount">-${tx.amount} WLD</div>
        <span class="transaction-status status-${tx.status}">
          ${tx.status.toUpperCase()}
        </span>
      </div>
      <div class="transaction-details">
        <div class="transaction-detail">
          <span class="detail-label">To:</span>
          <span class="detail-value">${tx.recipient.slice(0, 6)}...${tx.recipient.slice(-4)}</span>
        </div>
        <div class="transaction-detail">
          <span class="detail-label">Network:</span>
          <span class="detail-value">${tx.network === 'world-chain' ? 'World Chain' : 'Optimism'}</span>
        </div>
        <div class="transaction-detail">
          <span class="detail-label">Date:</span>
          <span class="detail-value">${new Date(tx.timestamp).toLocaleString()}</span>
        </div>
        ${tx.hash ? `
          <div class="transaction-detail">
            <span class="detail-label">Hash:</span>
            <span class="detail-value transaction-hash" onclick="copyHash('${tx.hash}')">
              ${tx.hash.slice(0, 8)}...
            </span>
          </div>
        ` : ''}
        ${tx.description ? `
          <div class="transaction-detail">
            <span class="detail-label">Description:</span>
            <span class="detail-value">${tx.description}</span>
          </div>
        ` : ''}
      </div>
    </div>
  `).join('');
}

// Copy transaction hash
function copyHash(hash) {
  navigator.clipboard.writeText(hash).then(() => {
    alert('Transaction hash copied!');
  });
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
