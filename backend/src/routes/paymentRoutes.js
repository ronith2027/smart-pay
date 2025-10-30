const express = require('express');
const { getPaymentHistory, addPayment } = require('../controllers/paymentController');
const authMiddleware = require('../middleware/authMiddleware');
const router = express.Router();

// Protect all payment routes
router.use(authMiddleware);

router.get('/history', getPaymentHistory);
router.post('/add', addPayment);

module.exports = router;