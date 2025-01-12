const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { generateImage, getUserImages, deleteImage } = require('../controller/imageController');

router.use(authMiddleware);

router.post('/generate', generateImage);
router.get('/user-images', getUserImages);
router.delete('/:id', deleteImage);

module.exports = router;