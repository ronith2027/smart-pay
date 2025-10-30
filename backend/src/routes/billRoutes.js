const express = require('express');
const router = express.Router();
const billController = require('../controllers/billController');
const authMiddleware = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

// Get user's bills with pagination and filters
router.get('/bills', billController.getBills);
router.get('/', billController.getBills);  // Keep original for compatibility

// Add a new bill
router.post('/create', billController.addBill);
router.post('/', billController.addBill);  // Keep original for compatibility

// Pay a specific bill
router.post('/pay', billController.payBill);
router.post('/:bill_id/pay', billController.payBill);  // Keep original for compatibility

// Update bill details
router.put('/:bill_id', billController.updateBill);

// Delete a bill
router.delete('/:bill_id', billController.deleteBill);

// Get bill analytics
router.get('/analytics', billController.getBillAnalytics);

module.exports = router;