require('dotenv').config();
const path = require('path');
const mongoose = require('mongoose');
const connect = require(path.join(__dirname, '..', 'config', 'dbConnection'));
const User = require(path.join(__dirname, '..', 'models', 'userModel'));

(async function() {
  try {
    await connect();
    const user = await User.findOne({}).lean();
    if (!user) {
      console.log('No users found. Run scripts/seed.js first.');
    } else {
      console.log('Use this email to login:');
      console.log('Email:', user.user_email);
      console.log('Password: 123456');
    }
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await mongoose.connection.close();
  }
})();
