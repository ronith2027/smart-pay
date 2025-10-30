const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const authMiddleware = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

// Create a new wallet
router.post('/create', walletController.createWallet);

// Get all wallets
router.get('/wallets', walletController.getWallets);

// Get wallet and account balances with statistics
router.get('/balances', walletController.getBalances);

// Add money to wallet
router.post('/add-money', walletController.addMoney);

// Add funds to wallet (keep for compatibility)
router.post('/add-funds', walletController.addFunds);

// Get transactions
router.get('/transactions', walletController.getTransactions);

// Move funds between wallet and account
router.post('/move', walletController.move);

// Get transaction ledger
router.get('/ledger', walletController.getLedger);

// Get spending analytics
router.get('/analytics', walletController.getAnalytics);
router.get('/spending-analytics', walletController.getSpendingAnalytics);

module.exports = router;
