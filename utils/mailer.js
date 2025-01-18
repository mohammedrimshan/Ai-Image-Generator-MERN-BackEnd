const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'gmail',  // Add this line
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  tls: {
    rejectUnauthorized: false  // Add this for testing purposes
  }
});
const sendOTPEmail = async (email, otp) => {
  const mailOptions = {
    from: process.env.SMTP_USER,
    to: email,
    subject: 'Your Login OTP',
    html: `
      <h1>Login Verification</h1>
      <p>Your OTP for login is: <strong>${otp}</strong></p>
      <p>This OTP will expire in ${process.env.OTP_EXPIRY_MINUTES} minutes.</p>
      <p>If you didn't request this OTP, please ignore this email.</p>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};

module.exports = { sendOTPEmail };