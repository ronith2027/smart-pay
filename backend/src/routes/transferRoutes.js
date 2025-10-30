const express = require('express');
const router = express.Router();
const transferController = require('../controllers/transferController');
const authMiddleware = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

// Find user by phone number or email
router.get('/find-user', transferController.findUser);

// Transfer money to another user
router.post('/send', transferController.transferMoney);

// Get transfer history
router.get('/history', transferController.getTransferHistory);

module.exports = router;