const express = require('express');
const { triggerRemindersManually } = require('../controllers/devController');

const router = express.Router();

router.post('/trigger-reminders', triggerRemindersManually);

module.exports = router;
