const User = require('../models/userModel');
const OTP = require('../models/optModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { generateOTP } = require('../utils/otp');
const { sendOTPEmail } = require('../utils/mailer');
require('dotenv').config();

// Step 1: User submits email and password
const initiateLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      console.log(`❌ Login attempt failed: User not found for email ${email}`);
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      console.log(`❌ Login attempt failed: Invalid password for email ${email}`);
      return res.status(401).json({ message: 'Invalid password' });
    }

    // Generate and save OTP
    const otp = generateOTP();
    console.log(`🔑 Generated OTP for ${email}: ${otp}`); // Console log for development
    
    await OTP.findOneAndDelete({ email }); // Delete any existing OTP
    await new OTP({ email, otp }).save();

    // Send OTP email
    const emailSent = await sendOTPEmail(email, otp);
    if (!emailSent) {
      console.log(`❌ Failed to send OTP email to ${email}`);
      return res.status(500).json({ message: 'Error sending OTP email' });
    }

    console.log(`📧 OTP email sent successfully to ${email}`);
    res.json({ 
      message: 'OTP sent successfully',
      email,
      requiresOTP: true
    });
  } catch (error) {
    console.error('❌ Error in initiateLogin:', error);
    res.status(500).json({ message: 'Error initiating login' });
  }
};

// Step 2: User submits OTP
const verifyOTPAndLogin = async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Find and validate OTP
    const otpDoc = await OTP.findOne({ email, otp });
    if (!otpDoc) {
      console.log(`❌ OTP verification failed for ${email}: Invalid or expired OTP`);
      return res.status(401).json({ message: 'Invalid or expired OTP' });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      console.log(`❌ User not found during OTP verification: ${email}`);
      return res.status(404).json({ message: 'User not found' });
    }

    // Delete used OTP
    await OTP.deleteOne({ _id: otpDoc._id });
    console.log(`✅ OTP verified successfully for ${email}`);

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user._id,
        email: user.email,
        name: user.username, // Include name in token payload
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log(`🎉 Login successful for user: ${user.username}`);
    res.json({
      token,
      user: {
        id: user._id,
        name: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('❌ Error in verifyOTPAndLogin:', error);
    res.status(500).json({ message: 'Error verifying OTP' });
  }
};

// Resend OTP
const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      console.log(`❌ Resend OTP failed: User not found for email ${email}`);
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate and save new OTP
    const otp = generateOTP();
    console.log(`🔄 Generated new OTP for ${email}: ${otp}`); // Console log for development
    
    await OTP.findOneAndDelete({ email }); // Delete any existing OTP
    await new OTP({ email, otp }).save();

    // Send new OTP email
    const emailSent = await sendOTPEmail(email, otp);
    if (!emailSent) {
      console.log(`❌ Failed to send new OTP email to ${email}`);
      return res.status(500).json({ message: 'Error sending OTP email' });
    }

    console.log(`📧 New OTP email sent successfully to ${email}`);
    res.json({ 
      message: 'New OTP sent successfully',
      email
    });
  } catch (error) {
    console.error('❌ Error in resendOTP:', error);
    res.status(500).json({ message: 'Error resending OTP' });
  }
};

const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      console.log(`❌ Registration failed: User already exists with email ${email} or username ${username}`);
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = new User({ username, email, password });
    await user.save();
    console.log(`✅ New user registered successfully: ${username}`);

    // Generate and send OTP for email verification
    const otp = generateOTP();
    console.log(`🔑 Generated registration OTP for ${email}: ${otp}`); // Console log for development
    
    await new OTP({ email, otp }).save();
    await sendOTPEmail(email, otp);

    console.log(`📧 Registration OTP email sent to ${email}`);
    res.status(201).json({ 
      message: 'Registration successful. Please verify your email with OTP',
      email
    });
  } catch (error) {
    console.error('❌ Error in register:', error);
    res.status(500).json({ message: 'Error creating user' });
  }
};

const checkAuth = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      user: {
        id: user._id,
        name: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('❌ Error in checkAuth:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
};



module.exports = { 
  register,
  initiateLogin,
  verifyOTPAndLogin,
  resendOTP,
  checkAuth    
};