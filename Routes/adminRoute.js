const express = require('express');
const router = express.Router();
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { getStats } = require('../controller/adminController');

router.use(authMiddleware);
router.use(adminMiddleware);

router.get('/stats', getStats);

module.exports = router;