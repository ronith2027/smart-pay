const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const { uploadProfileImage, handleUploadError } = require('../middleware/uploadMiddleware');

// Test route to verify server is updated
router.get('/test', (req, res) => {
  res.json({ 
    message: 'Backend is updated with new registration logic', 
    timestamp: new Date().toISOString(),
    version: '2.0'
  });
});

// Public routes (no authentication required)
router.post('/register', authController.registerUser);
router.post('/login', authController.loginUser);
router.post('/forgot/verify', authController.forgotVerify);
router.post('/forgot/reset', authController.resetPasswordWithToken);

// Protected routes (authentication required)
router.get('/profile', authMiddleware, authController.getProfile);
router.put('/profile', authMiddleware, authController.updateProfile);
router.put('/change-password', authMiddleware, authController.changePassword);
router.put('/profile-image', 
  authMiddleware, 
  uploadProfileImage, 
  handleUploadError, 
  authController.updateProfileImage
);

module.exports = router;