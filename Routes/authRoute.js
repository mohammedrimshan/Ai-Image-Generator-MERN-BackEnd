const express = require('express');
const router = express.Router();
const { 
  register,
  initiateLogin,
  verifyOTPAndLogin,
  resendOTP
} = require('../controller/authController');

router.post('/register', register);
router.post('/login/initiate', initiateLogin);
router.post('/login/verify', verifyOTPAndLogin);
router.post('/login/resend-otp', resendOTP);

module.exports = router;