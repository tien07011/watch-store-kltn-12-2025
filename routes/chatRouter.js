const express = require('express');
const router = express.Router();
const chatController = require('../controller/chatController');
const { authenicateUser, isAdminloggedIn } = require('../middlewares/authMiddleware');
const { uploadChat } = require('../middlewares/upload');

// User fetch conversation with admin
router.get('/conversation/me', authenicateUser, chatController.getMyConversation);

// Admin fetch a specific user's conversation
router.get('/conversation/:userId', isAdminloggedIn, chatController.getConversation);

// Admin list conversations
router.get('/conversations', isAdminloggedIn, chatController.listConversations);

// Post message (user or admin)
router.post('/message', authenicateUser, chatController.postMessage);
router.post('/admin/message', isAdminloggedIn, chatController.postMessage);

// Post image message (user or admin)
router.post('/message/image', authenicateUser, uploadChat.single('image'), chatController.postImageMessage);
router.post('/admin/message/image', isAdminloggedIn, uploadChat.single('image'), chatController.postImageMessage);

module.exports = router;
