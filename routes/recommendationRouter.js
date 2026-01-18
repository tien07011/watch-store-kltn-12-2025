const express = require('express');
const router = express.Router();
const { authenicateUser } = require('../middlewares/authMiddleware');
const { get_recommendations } = require('../controller/recommendationController');

// GET /recommendations -> JSON list of recommended products for the logged-in user
router.get('/', authenicateUser, get_recommendations);

module.exports = router;
