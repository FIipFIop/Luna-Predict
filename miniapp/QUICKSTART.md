# Quick Start Guide

Get your World Pay Mini App running in 5 minutes.

## Step 1: Update Configuration

Edit `miniapp/config.js` and update these 3 values:

```javascript
// Line 11: Your World ID App ID
appId: 'app_YOUR_APP_ID_HERE',

// Line 12: Your World ID Action
actionId: 'your-action-name',

// Line 17: Your Ethereum wallet address (for receiving WLD)
merchantAddress: '0xYOUR_WALLET_ADDRESS_HERE',
```

### Getting World ID Credentials

1. Go to https://developer.worldcoin.org/
2. Sign in with World ID
3. Click "Create App" or select existing app
4. Copy your `app_id` (starts with `app_`)
5. Go to "Actions" tab → Create action named `login`
6. Copy the action name

## Step 2: Deploy to Vercel

```bash
# Make sure you're in the project root
cd "C:\Users\pjtla\Desktop\perps predict world"

# Deploy to production
vercel --prod
```

Your Mini App will be live at:
```
https://your-domain.vercel.app/miniapp/
```

## Step 3: Configure World App

1. Go to https://developer.worldcoin.org/
2. Open your app
3. Navigate to "Mini Apps" section
4. Click "Add Mini App"
5. Enter your URL: `https://your-domain.vercel.app/miniapp/`
6. Select permissions: `wallet`, `payment`
7. Submit for review

## Step 4: Test in World App

1. Open World App on your phone
2. Go to "Explore" or "Mini Apps"
3. Find your app (if approved) or use test URL
4. Test the following:
   - ✅ Sign in with World ID
   - ✅ View balance
   - ✅ Send test payment (0.01 WLD)
   - ✅ Check transaction history

## Common Issues

### Issue: "MiniKit SDK not loaded"
**Solution**: Make sure you're testing inside World App, not a regular browser.

### Issue: Balance shows "Error"
**Solution**:
1. Check that you're on World Chain network
2. Verify RPC URL is accessible
3. Make sure you have WLD in your wallet

### Issue: Payment fails
**Solution**:
1. Ensure you have enough WLD balance
2. Check that merchant address is valid
3. Verify backend API is running

### Issue: Can't see transactions
**Solution**:
1. Open browser dev tools (if available)
2. Check localStorage: `localStorage.getItem('worldpay_transactions')`
3. Clear and retry: `localStorage.clear()`

## File Structure

```
miniapp/
├── config.js          ⚙️  Update this first!
├── index.html         📄  UI structure
├── app.js            🎯  Main logic
├── lib/
│   └── worldapp.js   🔧  SDK wrapper
├── styles/
│   └── app.css       🎨  Styling
├── README.md         📖  Full documentation
└── QUICKSTART.md     ⚡  This file
```

## What's Next?

### Customize Your App

1. **Change theme**: Edit `config.js` → `ui.theme`
2. **Update app name**: Edit `config.js` → `ui.appName`
3. **Change icon**: Edit `config.js` → `ui.appIcon`

### Add Features

- **Credits system**: Modify payment verification to award credits
- **User profiles**: Add more user data fields
- **Analytics**: Track usage metrics
- **Receipts**: Generate payment receipts

### Production Checklist

- [ ] Updated all credentials in `config.js`
- [ ] Tested sign-in flow
- [ ] Tested payment with small amount
- [ ] Verified transaction history works
- [ ] Deployed to Vercel
- [ ] Submitted to World App for review
- [ ] Tested in actual World App environment

## Support

- 📚 Full docs: See `README.md`
- 🌐 World Docs: https://docs.worldcoin.org/mini-apps
- 👥 Developer Portal: https://developer.worldcoin.org/

---

**Ready to launch!** 🚀
