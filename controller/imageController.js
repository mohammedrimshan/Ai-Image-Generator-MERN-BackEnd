const Image = require('../models/imageModel');
const { HfInference } = require('@huggingface/inference');
const cloudinary = require('cloudinary').v2;
const { promisify } = require('util');
const stream = require('stream');
const pipeline = promisify(stream.pipeline);
require('dotenv').config();

if (!process.env.HUGGINGFACE_API_KEY) {
  console.error('HUGGINGFACE_API_KEY is not set in environment variables');
  process.exit(1);
}

console.log('Hugging Face client initialized with token:', 
  process.env.HUGGINGFACE_API_KEY.substring(0, 5) + '...');

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

cloudinary.config({
  cloud_name: "edusphere",     // Your cloud name
  api_key: "393971352228641",  // Your API key
  api_secret: "mGhIYjUiVtAPFX7Ywx0R_i8-mPw"  // Your API secret
});
// Updated utility function to handle Blob to Buffer conversion
const uploadToCloudinary = async (blob) => {
  return new Promise(async (resolve, reject) => {
    try {
      // Convert Blob to Buffer
      const arrayBuffer = await blob.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'ai-generated' },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      
      uploadStream.end(buffer);
    } catch (error) {
      reject(error);
    }
  });
};

const generateImage = async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ message: 'Prompt is required' });
    }

    const userGenerationCount = await Image.countDocuments({
      userId: req.user.id,
      createdAt: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });

    if (userGenerationCount >= 10) {
      return res.status(429).json({ 
        message: 'Daily generation limit reached. Please try again tomorrow.' 
      });
    }

    const imageBlob = await hf.textToImage({
      model: 'stabilityai/stable-diffusion-2-1',
      inputs: prompt,
      parameters: {
        negative_prompt: 'blurry, bad quality, distorted',
        num_inference_steps: 30,
        guidance_scale: 7.5
      }
    });

    const uploadResult = await uploadToCloudinary(imageBlob);

    const image = new Image({
      userId: req.user.id,
      prompt,
      imageUrl: uploadResult.secure_url,
      public_id: uploadResult.public_id,
      metadata: {
        width: uploadResult.width,
        height: uploadResult.height,
        format: uploadResult.format,
        model: 'stable-diffusion-2-1'
      }
    });

    await image.save();

    res.status(201).json({
      success: true,
      data: image
    });

  } catch (error) {
    console.error('Image generation error:', error);

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        message: 'Invalid input data',
        errors: error.errors
      });
    }

    if (error.response?.status === 429) {
      return res.status(429).json({
        message: 'Too many requests. Please try again later.'
      });
    }

    res.status(500).json({
      message: 'Error generating image',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getUserImages = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const [images, total] = await Promise.all([
      Image.find({ userId: req.user.id })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Image.countDocuments({ userId: req.user.id })
    ]);

    res.json({
      success: true,
      data: images,
      pagination: {
        current: page,
        total: Math.ceil(total / limit),
        hasMore: page * limit < total
      }
    });

  } catch (error) {
    console.error('Error fetching images:', error);
    res.status(500).json({ 
      message: 'Error fetching images',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const deleteImage = async (req, res) => {
  try {
    const image = await Image.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!image) {
      return res.status(404).json({ message: 'Image not found' });
    }

    if (image.public_id) {
      await cloudinary.uploader.destroy(image.public_id);
    }

    await image.deleteOne();

    res.json({
      success: true,
      message: 'Image deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({
      message: 'Error deleting image',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getImageDetails = async (req, res) => {
  try {
    const image = await Image.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!image) {
      return res.status(404).json({ message: 'Image not found' });
    }

    res.json({
      success: true,
      data: image
    });

  } catch (error) {
    console.error('Error fetching image details:', error);
    res.status(500).json({
      message: 'Error fetching image details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  generateImage,
  getUserImages,
  deleteImage,
  getImageDetails
};