require('dotenv').config();
const path = require('path');
const mongoose = require('mongoose');
const connect = require(path.join(__dirname, '..', 'config', 'dbConnection'));
const Admin = require(path.join(__dirname, '..', 'models', 'adminModel'));

(async function() {
  try {
    await connect();
    const admin = await Admin.findOne({}).lean();
    if (!admin) {
      console.log('No users found. Run scripts/seed.js first.');
    } else {
      console.log('Use this email to login:');
      console.log('Email:', admin.email);
      console.log('Password: 123456');
    }
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await mongoose.connection.close();
  }
})();
