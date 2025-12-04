require('dotenv').config();
const path = require('path');
const mongoose = require('mongoose');
const connect = require(path.join(__dirname, '..', 'config', 'dbConnection'));
const User = require(path.join(__dirname, '..', 'models', 'userModel'));
const bcrypt = require('bcrypt');

(async function() {
  try {
    await connect();
    const user = await User.findOne({ user_email: 'BinhNguyen.Le47@gmail.com' }).lean();
    if (!user) { console.log('User not found'); return; }
    console.log('Hash:', user.user_password);
    const ok = await bcrypt.compare('123456', user.user_password);
    console.log('bcrypt.compare("123456") ->', ok);
  } catch (e) {
    console.error(e);
  } finally {
    await mongoose.connection.close();
  }
})();
