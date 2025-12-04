const express = require('express');
const router = express.Router();
const chatController = require('../controller/chatController');
const { authenicateUser, isAdminloggedIn } = require('../middlewares/authMiddleware');

// User fetch conversation with admin
router.get('/conversation/:userId', isAdminloggedIn, chatController.getConversation);

// Admin list conversations
router.get('/conversations', isAdminloggedIn, chatController.listConversations);

// Post message (user or admin)
router.post('/message', authenicateUser, chatController.postMessage);
router.post('/admin/message', isAdminloggedIn, chatController.postMessage);

module.exports = router;
