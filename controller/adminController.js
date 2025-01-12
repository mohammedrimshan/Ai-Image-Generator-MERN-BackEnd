const User = require('../models/userModel');
const Image = require('../models/imageModel');
require('dotenv').config();

const getStats = async (req, res) => {
  try {
    const userCount = await User.countDocuments({ role: 'user' });
    const imageCount = await Image.countDocuments();
    const recentImages = await Image.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('userId', 'username');

    res.json({
      userCount,
      imageCount,
      recentImages
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching stats' });
  }
};

module.exports = { getStats };