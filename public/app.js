// Supabase client initialization
const SUPABASE_URL = 'https://vcawdkjknxsdshmomavn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjYXdka2prbnhzZHNobW9tYXZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5NjgxMTUsImV4cCI6MjA4MTU0NDExNX0.PqaCUdtUGPvZ9esVxQX1aalpF2eQh-e-gvChxSCZ9yw';

// Load Supabase client from CDN
const script = document.createElement('script');
script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
document.head.appendChild(script);

let supabase;
let currentUser = null;
let userCredits = 0;

script.onload = () => {
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  checkAuth();
};

// Telegram WebApp initialization
const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();
tg.enableClosingConfirmation();

// Initialize MiniKit for World App
let minikitInitialized = false;
async function initMiniKit() {
  if (minikitInitialized) return true;

  // Wait for MiniKit to be available
  let retries = 0;
  while (!window.MiniKit && retries < 20) {
    await new Promise(resolve => setTimeout(resolve, 100));
    retries++;
  }

  if (!window.MiniKit) {
    console.error('❌ MiniKit SDK not loaded after waiting');
    return false;
  }

  try {
    await MiniKit.install();
    minikitInitialized = true;
    console.log('✅ MiniKit initialized');
    return true;
  } catch (error) {
    console.error('❌ MiniKit initialization failed:', error);
    return false;
  }
}

// Initialize MiniKit when page loads
window.addEventListener('load', () => {
  setTimeout(initMiniKit, 500);
});

const $ = id => document.getElementById(id);

// DOM elements
const authModal = $('authModal');
const authForm = $('authForm');
const authTitle = $('authTitle');
const authEmail = $('authEmail');
const authPassword = $('authPassword');
const authFullName = $('authFullName');
const fullNameGroup = $('fullNameGroup');
const authSubmitBtn = $('authSubmitBtn');
const authToggleText = $('authToggleText');
const authToggleLink = $('authToggleLink');
const authError = $('authError');
const walletAuthBtn = $('walletAuthBtn');

const paymentModal = $('paymentModal');
const paymentMethodSelect = $('paymentMethodSelect');
const selectWldBtn = $('selectWldBtn');
const selectSolBtn = $('selectSolBtn');
const paymentStep1 = $('paymentStep1');
const paymentStep2 = $('paymentStep2');
const paymentStep3 = $('paymentStep3');
const backToMethodsBtn = $('backToMethodsBtn');
const senderWallet = $('senderWallet');
const initPaymentBtn = $('initPaymentBtn');
const receiverWallet = $('receiverWallet');
const exactAmount = $('exactAmount');
const paymentAmount = $('paymentAmount');
const sentPaymentBtn = $('sentPaymentBtn');
const cancelPaymentBtn = $('cancelPaymentBtn');
const closePaymentBtn = $('closePaymentBtn');
const paymentTimer = $('paymentTimer');
const paymentError = $('paymentError');
const copyWalletBtn = $('copyWalletBtn');
// WLD payment elements
const wldPaymentStep1 = $('wldPaymentStep1');
const wldPaymentStep2 = $('wldPaymentStep2');
const backToMethodsBtn2 = $('backToMethodsBtn2');
const wldFromAddress = $('wldFromAddress');
const wldNetwork = $('wldNetwork');
const initWldPaymentBtn = $('initWldPaymentBtn');
const wldReceiverAddress = $('wldReceiverAddress');
const wldNetworkDisplay = $('wldNetworkDisplay');
const wldTxHash = $('wldTxHash');
const verifyWldPaymentBtn = $('verifyWldPaymentBtn');
const cancelWldPaymentBtn = $('cancelWldPaymentBtn');
const copyWldAddressBtn = $('copyWldAddressBtn');

const userInfo = $('userInfo');
const userCreditsEl = $('userCredits');
const buyCreditsBtn = $('buyCreditsBtn');
const logoutBtn = $('logoutBtn');

const dropzone = $('dropzone');
const fileInput = $('fileInput');
const cameraInput = $('cameraInput');
const cameraBtn = $('cameraBtn');
const galleryBtn = $('galleryBtn');
const preview = $('preview');
const previewImg = $('previewImg');
const removeBtn = $('removeBtn');
const analyzeBtn = $('analyzeBtn');
const timeframe = $('timeframe');
const timeframeConfirm = $('timeframeConfirm');
const detectedTimeframe = $('detectedTimeframe');
const confirmTimeframeBtn = $('confirmTimeframeBtn');
const changeTimeframeBtn = $('changeTimeframeBtn');
const results = $('results');
const error = $('error');

let selectedFile = null;
let detectedTimeframeValue = null;
let analysisData = null;
let isLoginMode = true;
let currentPaymentId = null;
let paymentVerificationInterval = null;

// Apply Telegram theme
document.body.style.backgroundColor = tg.themeParams.bg_color || '#000000';
document.body.style.color = tg.themeParams.text_color || '#ffffff';

// ============= AUTHENTICATION =============

async function checkAuth() {
  const { data: { session } } = await supabase.auth.getSession();

  if (session) {
    currentUser = session.user;
    await loadUserData();
    showMainApp();
  } else {
    showAuthModal();
  }
}

async function loadUserData() {
  try {
    const response = await fetch('/api/auth/user', {
      headers: {
        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session.access_token}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      userCredits = data.credits;
      updateUserUI();
    }
  } catch (err) {
    console.error('Error loading user data:', err);
  }
}

function showAuthModal() {
  authModal.classList.add('active');
}

function hideAuthModal() {
  authModal.classList.remove('active');
  authError.textContent = '';
}

function showMainApp() {
  hideAuthModal();
  userInfo.style.display = 'flex';
}

function updateUserUI() {
  userCreditsEl.textContent = userCredits;
}

// Toggle between login and signup
authToggleLink.addEventListener('click', (e) => {
  e.preventDefault();
  isLoginMode = !isLoginMode;

  if (isLoginMode) {
    authTitle.textContent = 'Login';
    authSubmitBtn.textContent = 'Login';
    authToggleText.textContent = "Don't have an account?";
    authToggleLink.textContent = 'Sign up';
    fullNameGroup.style.display = 'none';
  } else {
    authTitle.textContent = 'Sign Up';
    authSubmitBtn.textContent = 'Sign Up';
    authToggleText.textContent = 'Already have an account?';
    authToggleLink.textContent = 'Login';
    fullNameGroup.style.display = 'block';
  }

  authError.textContent = '';
});

// Auth form submission
authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  authError.textContent = '';
  authSubmitBtn.disabled = true;
  authSubmitBtn.textContent = isLoginMode ? 'Logging in...' : 'Signing up...';

  try {
    const endpoint = isLoginMode ? '/api/auth/login' : '/api/auth/signup';
    const body = {
      email: authEmail.value,
      password: authPassword.value
    };

    if (!isLoginMode) {
      body.fullName = authFullName.value;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (response.ok) {
      // Set session in Supabase client
      await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token
      });

      currentUser = data.user;
      await loadUserData();
      showMainApp();

      authEmail.value = '';
      authPassword.value = '';
      authFullName.value = '';
    } else {
      authError.textContent = data.error || 'Authentication failed';
    }
  } catch (err) {
    authError.textContent = 'Network error. Please try again.';
  } finally {
    authSubmitBtn.disabled = false;
    authSubmitBtn.textContent = isLoginMode ? 'Login' : 'Sign Up';
  }
});

// Logout
logoutBtn.addEventListener('click', async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`
      }
    });

    await supabase.auth.signOut();
    currentUser = null;
    userCredits = 0;
    userInfo.style.display = 'none';
    showAuthModal();
  } catch (err) {
    console.error('Logout error:', err);
  }
});

// World App Wallet Authentication (SIWE)
walletAuthBtn.addEventListener('click', async () => {
  try {
    authError.textContent = '';
    walletAuthBtn.disabled = true;

    // Initialize MiniKit if not already done
    if (!minikitInitialized) {
      walletAuthBtn.textContent = 'Initializing MiniKit...';
      const initialized = await initMiniKit();

      if (!initialized) {
        throw new Error('MiniKit SDK failed to load. Please make sure you are using World App and have a stable internet connection.');
      }
    }

    if (!window.MiniKit || !minikitInitialized) {
      throw new Error('Please open this app in World App to use wallet authentication');
    }

    walletAuthBtn.textContent = 'Requesting nonce...';

    // Step 1: Get nonce from backend
    const nonceRes = await fetch('/api/auth/nonce', {
      credentials: 'include'
    });

    if (!nonceRes.ok) {
      throw new Error('Failed to get nonce from server');
    }

    const { nonce } = await nonceRes.json();
    console.log('Nonce received:', nonce);

    walletAuthBtn.textContent = 'Sign with wallet...';

    // Step 2: Request wallet signature via MiniKit
    const { commandPayload, finalPayload } = await MiniKit.commandsAsync.walletAuth({
      nonce: nonce,
      requestId: '0',
      expirationTime: new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000),
      notBefore: new Date(new Date().getTime() - 24 * 60 * 60 * 1000),
      statement: 'Sign in to Luna Predict - AI-powered crypto chart analysis'
    });

    if (finalPayload.status === 'error') {
      throw new Error('Signature request rejected');
    }

    walletAuthBtn.textContent = 'Verifying...';

    // Step 3: Send to backend for verification
    const loginRes = await fetch('/api/auth/wallet-login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        payload: finalPayload,
        nonce: nonce
      })
    });

    const loginData = await loginRes.json();

    if (!loginRes.ok || !loginData.isValid) {
      throw new Error(loginData.error || 'Login verification failed');
    }

    // Step 4: Set session in Supabase client (if session token provided)
    if (loginData.session && loginData.session.properties) {
      const hashed_token = loginData.session.properties.hashed_token;
      // For magic link, we need to exchange it for session
      // This is a simplified approach - in production you'd handle the magic link properly
      console.log('Login successful:', loginData);
    }

    // Step 5: Success - reload user data
    currentUser = { id: loginData.userId };
    await loadUserData();
    showMainApp();

    walletAuthBtn.textContent = 'Sign in with World App';

  } catch (error) {
    console.error('Wallet auth error:', error);
    authError.textContent = error.message || 'Wallet authentication failed';
    walletAuthBtn.textContent = 'Sign in with World App';
  } finally {
    walletAuthBtn.disabled = false;
  }
});

// ============= PAYMENT =============

buyCreditsBtn.addEventListener('click', () => {
  paymentModal.classList.add('active');
  // Show payment method selector
  paymentMethodSelect.style.display = 'block';
  paymentStep1.style.display = 'none';
  paymentStep2.style.display = 'none';
  paymentStep3.style.display = 'none';
  wldPaymentStep1.style.display = 'none';
  wldPaymentStep2.style.display = 'none';
  paymentError.textContent = '';
  senderWallet.value = '';
  wldFromAddress.value = '';
  wldTxHash.value = '';
});

closePaymentBtn.addEventListener('click', () => {
  paymentModal.classList.remove('active');
  if (paymentVerificationInterval) {
    clearInterval(paymentVerificationInterval);
    paymentVerificationInterval = null;
  }
});

cancelPaymentBtn.addEventListener('click', () => {
  paymentStep1.style.display = 'block';
  paymentStep2.style.display = 'none';
  paymentStep3.style.display = 'none';
  paymentError.textContent = '';
  if (paymentVerificationInterval) {
    clearInterval(paymentVerificationInterval);
    paymentVerificationInterval = null;
  }
});

// Payment method selection
selectWldBtn.addEventListener('click', () => {
  paymentMethodSelect.style.display = 'none';
  wldPaymentStep1.style.display = 'block';
});

selectSolBtn.addEventListener('click', () => {
  paymentMethodSelect.style.display = 'none';
  paymentStep1.style.display = 'block';
});

// Back to payment methods
backToMethodsBtn.addEventListener('click', () => {
  paymentStep1.style.display = 'none';
  paymentMethodSelect.style.display = 'block';
});

backToMethodsBtn2.addEventListener('click', () => {
  wldPaymentStep1.style.display = 'none';
  paymentMethodSelect.style.display = 'block';
});

// WLD Payment Flow
let currentWldPaymentId = null;

initWldPaymentBtn.addEventListener('click', async () => {
  const fromAddr = wldFromAddress.value.trim();
  const network = wldNetwork.value;

  if (!fromAddr) {
    paymentError.textContent = 'Please enter your wallet address';
    return;
  }

  paymentError.textContent = '';
  initWldPaymentBtn.disabled = true;
  initWldPaymentBtn.textContent = 'Initializing...';

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch('/api/payment/worldcoin/init', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        fromAddress: fromAddr,
        network: network
      })
    });

    const data = await response.json();

    if (response.ok) {
      currentWldPaymentId = data.paymentId;
      wldReceiverAddress.textContent = data.toAddress;
      wldNetworkDisplay.textContent = data.network === 'world-chain' ? 'World Chain' : 'Optimism';

      wldPaymentStep1.style.display = 'none';
      wldPaymentStep2.style.display = 'block';
    } else {
      paymentError.textContent = data.error || 'Payment initialization failed';
    }
  } catch (err) {
    paymentError.textContent = 'Network error. Please try again.';
  } finally {
    initWldPaymentBtn.disabled = false;
    initWldPaymentBtn.textContent = 'Continue';
  }
});

cancelWldPaymentBtn.addEventListener('click', () => {
  wldPaymentStep1.style.display = 'block';
  wldPaymentStep2.style.display = 'none';
  paymentError.textContent = '';
  wldTxHash.value = '';
});

copyWldAddressBtn.addEventListener('click', () => {
  const address = wldReceiverAddress.textContent;
  navigator.clipboard.writeText(address).then(() => {
    const originalText = copyWldAddressBtn.textContent;
    copyWldAddressBtn.textContent = 'Copied!';
    setTimeout(() => {
      copyWldAddressBtn.textContent = originalText;
    }, 2000);
  });
});

verifyWldPaymentBtn.addEventListener('click', async () => {
  const txHash = wldTxHash.value.trim();

  if (!txHash) {
    paymentError.textContent = 'Please enter the transaction hash';
    return;
  }

  paymentError.textContent = '';
  verifyWldPaymentBtn.disabled = true;
  verifyWldPaymentBtn.textContent = 'Verifying...';

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch('/api/payment/worldcoin/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        paymentId: currentWldPaymentId,
        transactionHash: txHash
      })
    });

    const data = await response.json();

    if (response.ok && data.status === 'confirmed') {
      // Payment successful!
      userCredits += data.credits;
      updateUserUI();

      paymentModal.classList.remove('active');
      wldPaymentStep2.style.display = 'none';
      paymentMethodSelect.style.display = 'block';
      wldTxHash.value = '';

      alert(`Payment confirmed! ${data.credits} credits added to your account.`);
    } else if (data.status === 'pending' || data.status === 'processing') {
      paymentError.textContent = 'Transaction is being processed. Please wait a moment and try again.';
    } else {
      paymentError.textContent = data.error || 'Payment verification failed';
    }
  } catch (err) {
    paymentError.textContent = 'Network error. Please try again.';
  } finally {
    verifyWldPaymentBtn.disabled = false;
    verifyWldPaymentBtn.textContent = 'Verify Payment';
  }
});

initPaymentBtn.addEventListener('click', async () => {
  const wallet = senderWallet.value.trim();

  if (!wallet) {
    paymentError.textContent = 'Please enter your wallet address';
    return;
  }

  paymentError.textContent = '';
  initPaymentBtn.disabled = true;
  initPaymentBtn.textContent = 'Checking balance...';

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch('/api/payment/init', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ senderWallet: wallet })
    });

    const data = await response.json();

    if (response.ok) {
      currentPaymentId = data.paymentId;
      receiverWallet.textContent = data.receiverWallet;
      exactAmount.textContent = `${data.amount} SOL`;
      paymentAmount.textContent = `${data.amount} SOL`;

      paymentStep1.style.display = 'none';
      paymentStep2.style.display = 'block';
    } else {
      paymentError.textContent = data.error || data.message || 'Payment initialization failed';
    }
  } catch (err) {
    paymentError.textContent = 'Network error. Please try again.';
  } finally {
    initPaymentBtn.disabled = false;
    initPaymentBtn.textContent = 'Check Balance & Continue';
  }
});

copyWalletBtn.addEventListener('click', () => {
  navigator.clipboard.writeText(receiverWallet.textContent);
  const originalText = copyWalletBtn.textContent;
  copyWalletBtn.textContent = 'Copied!';
  setTimeout(() => {
    copyWalletBtn.textContent = originalText;
  }, 2000);
});

sentPaymentBtn.addEventListener('click', () => {
  paymentStep2.style.display = 'none';
  paymentStep3.style.display = 'block';
  startPaymentVerification();
});

async function startPaymentVerification() {
  let timeLeft = 120; // 2 minutes in seconds
  let checkCount = 0;
  const maxChecks = 12; // Check every 10 seconds for 2 minutes

  const updateTimer = () => {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    paymentTimer.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    timeLeft--;

    if (timeLeft < 0) {
      clearInterval(timerInterval);
      clearInterval(paymentVerificationInterval);
      paymentError.textContent = 'Payment verification timeout. Please try again.';
      paymentStep3.style.display = 'none';
      paymentStep1.style.display = 'block';
    }
  };

  const timerInterval = setInterval(updateTimer, 1000);
  updateTimer();

  paymentVerificationInterval = setInterval(async () => {
    checkCount++;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/payment/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ paymentId: currentPaymentId })
      });

      const data = await response.json();

      if (data.status === 'verified') {
        clearInterval(timerInterval);
        clearInterval(paymentVerificationInterval);
        paymentVerificationInterval = null;

        // Update credits
        userCredits += data.credits;
        updateUserUI();

        // Show success and close modal
        alert('Payment verified! Credit added to your account.');
        paymentModal.classList.remove('active');
        paymentStep3.style.display = 'none';
        paymentStep1.style.display = 'block';
      } else if (data.status === 'cancelled' || data.error) {
        clearInterval(timerInterval);
        clearInterval(paymentVerificationInterval);
        paymentVerificationInterval = null;
        paymentError.textContent = data.error || 'Payment verification failed';
        paymentStep3.style.display = 'none';
        paymentStep1.style.display = 'block';
      }
    } catch (err) {
      console.error('Payment verification error:', err);
    }

    if (checkCount >= maxChecks) {
      clearInterval(timerInterval);
      clearInterval(paymentVerificationInterval);
      paymentVerificationInterval = null;
      paymentError.textContent = 'Payment verification timeout. Please try again.';
      paymentStep3.style.display = 'none';
      paymentStep1.style.display = 'block';
    }
  }, 10000); // Check every 10 seconds
}

// ============= CHART ANALYSIS =============

// Dropzone click
dropzone.addEventListener('click', e => {
  if (!e.target.closest('.remove-btn') && !e.target.closest('.mobile-btn')) {
    fileInput.click();
  }
});

fileInput.addEventListener('change', e => { if (e.target.files[0]) handleFile(e.target.files[0]); });
cameraInput.addEventListener('change', e => { if (e.target.files[0]) handleFile(e.target.files[0]); });

if (cameraBtn) {
  cameraBtn.addEventListener('click', e => {
    e.stopPropagation();
    cameraInput.click();
    tg.HapticFeedback.impactOccurred('light');
  });
}

if (galleryBtn) {
  galleryBtn.addEventListener('click', e => {
    e.stopPropagation();
    fileInput.click();
    tg.HapticFeedback.impactOccurred('light');
  });
}

// Drag and drop
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(e => {
  dropzone.addEventListener(e, ev => {
    ev.preventDefault();
    ev.stopPropagation();
  });
});

dropzone.addEventListener('dragover', () => dropzone.classList.add('dragover'));
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
dropzone.addEventListener('drop', e => {
  dropzone.classList.remove('dragover');
  if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
});

function handleFile(file) {
  if (!file.type.startsWith('image/')) {
    showError('Please select an image file');
    return;
  }

  selectedFile = file;
  const reader = new FileReader();
  reader.onload = e => {
    previewImg.src = e.target.result;
    preview.classList.remove('hidden');
    dropzone.querySelector('.dropzone-content').classList.add('hidden');
    analyzeBtn.disabled = false;
    results.classList.add('hidden');
    error.classList.add('hidden');

    if (timeframe.value === 'auto') {
      timeframeConfirm.classList.add('hidden');
    }

    tg.HapticFeedback.impactOccurred('medium');
  };
  reader.readAsDataURL(file);
}

removeBtn.addEventListener('click', e => {
  e.stopPropagation();
  selectedFile = null;
  previewImg.src = '';
  preview.classList.add('hidden');
  dropzone.querySelector('.dropzone-content').classList.remove('hidden');
  analyzeBtn.disabled = true;
  fileInput.value = '';
  cameraInput.value = '';
  timeframeConfirm.classList.add('hidden');
  results.classList.add('hidden');
  error.classList.add('hidden');
  tg.HapticFeedback.impactOccurred('light');
});

timeframe.addEventListener('change', () => {
  if (timeframe.value === 'auto') {
    timeframeConfirm.classList.add('hidden');
  }
});

confirmTimeframeBtn.addEventListener('click', () => {
  timeframeConfirm.classList.add('hidden');
  showResults(analysisData);
});

changeTimeframeBtn.addEventListener('click', () => {
  timeframeConfirm.classList.add('hidden');
  results.classList.add('hidden');
});

analyzeBtn.addEventListener('click', async () => {
  if (!selectedFile) return;

  // Check if user has credits
  if (userCredits < 1) {
    showError('You need credits to analyze charts. Click "Buy Credits" to purchase.');
    return;
  }

  const formData = new FormData();
  formData.append('chart', selectedFile);
  formData.append('timeframe', timeframe.value);

  analyzeBtn.disabled = true;
  analyzeBtn.querySelector('.btn-text').textContent = 'Analyzing...';
  analyzeBtn.querySelector('.btn-loader').classList.remove('hidden');
  error.classList.add('hidden');
  results.classList.add('hidden');

  tg.HapticFeedback.impactOccurred('medium');

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`
      },
      body: formData
    });

    const data = await response.json();

    if (response.ok) {
      analysisData = data;

      // Update credits
      if (data.creditsRemaining !== undefined) {
        userCredits = data.creditsRemaining;
        updateUserUI();
      }

      if (timeframe.value === 'auto' && data.timeframe) {
        detectedTimeframeValue = data.timeframe;
        detectedTimeframe.textContent = `${data.timeframe} (${data.timeframeConfidence || 'medium'} confidence)`;
        timeframeConfirm.classList.remove('hidden');
      } else {
        showResults(data);
      }

      tg.HapticFeedback.notificationOccurred('success');
    } else {
      showError(data.error || data.message || 'Analysis failed');
      tg.HapticFeedback.notificationOccurred('error');
    }
  } catch (err) {
    showError('Network error. Please try again.');
    tg.HapticFeedback.notificationOccurred('error');
  } finally {
    analyzeBtn.disabled = false;
    analyzeBtn.querySelector('.btn-text').textContent = 'Analyze Chart';
    analyzeBtn.querySelector('.btn-loader').classList.add('hidden');
  }
});

function showResults(data) {
  $('recommendation').textContent = data.recommendation;
  $('recommendation').className = `card-value recommendation ${data.recommendation}`;
  $('certainty').textContent = data.certainty;
  $('riskReward').textContent = data.riskRewardRatio;
  $('entryPrice').textContent = data.entryPrice;
  $('stopLoss').textContent = data.stopLoss;
  $('takeProfit').textContent = data.takeProfit;
  $('report').textContent = data.report;
  results.classList.remove('hidden');
  results.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function showError(message) {
  error.textContent = message;
  error.classList.remove('hidden');
  error.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
