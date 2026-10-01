const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { getChatHistory } = require('../controllers/chatController');

const router = express.Router();

router.use(protect);

router.get('/history', getChatHistory);

module.exports = router;
