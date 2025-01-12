const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  prompt: {
    type: String,
    required: true
  },
  imageUrl: {
    type: String,
    required: true
  },
  public_id: String,
  metadata: {
    width: Number,
    height: Number,
    format: String,
    model: String
  }
}, { timestamps: true });

module.exports = mongoose.model('Image', imageSchema);