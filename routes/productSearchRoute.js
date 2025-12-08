const express = require('express');
const { getUserData } = require('../middlewares/authMiddleware');
const router = express.Router();

const {get_searchedProducts} = require('../controller/searchController')

// Allow browsing without login; attach user data if available
router.get('/', getUserData, get_searchedProducts);

module.exports = router;
