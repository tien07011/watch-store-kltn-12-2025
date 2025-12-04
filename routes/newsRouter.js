const express = require('express');
const router = express.Router();
const newsController = require('../controller/newsController');

// Public routes
router.get('/news', newsController.list);
router.get('/news/:slug', newsController.detail);

module.exports = router;
