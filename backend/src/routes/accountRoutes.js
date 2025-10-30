const express = require('express');
const router = express.Router();
const accountController = require('../controllers/accountController');
const authMiddleware = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

// Get user's bank accounts
router.get('/', accountController.getAccounts);

// Add a new bank account
router.post('/create', accountController.addAccount);
router.post('/', accountController.addAccount);  // Keep original for compatibility

// Update account details
router.put('/:account_id', accountController.updateAccount);

// Delete an account
router.delete('/:account_id', accountController.deleteAccount);

// Set primary account
router.put('/:account_id/set-primary', accountController.setPrimaryAccount);

// Get account transactions
router.get('/:account_id/transactions', accountController.getAccountTransactions);

// Add money to account
router.post('/add-money', accountController.addMoneyToAccount);

module.exports = router;
