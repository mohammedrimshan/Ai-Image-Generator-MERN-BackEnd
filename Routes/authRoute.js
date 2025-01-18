const express = require('express');
const router = express.Router();
const { 
  register,
  initiateLogin,
  verifyOTPAndLogin,
  resendOTP,
  checkAuth
} = require('../controller/authController');
const { authMiddleware } = require('../middleware/auth');

router.post('/register', register);
router.post('/login/initiate', initiateLogin);
router.post('/login/verify', verifyOTPAndLogin);
router.post('/login/resend-otp', resendOTP);
router.get('/check', authMiddleware, checkAuth);  

module.exports = router;