const express = require('express');
const dbConnect = require('./config/dbConnection');
const bodyParser = require('body-parser');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});
const nocache = require('nocache');
const dotenv = require('dotenv').config();
const path = require('path')
const cookieParser = require('cookie-parser');
const PORT = process.env.PORT || 4000;
const hbs = require('express-handlebars');
const handlebars = require('handlebars');
const session = require('express-session')
const { notFound, errorHandler } = require('./middlewares/errorHandler');
const publicDirectoryPath = path.join(__dirname, '/public')
const flash = require('connect-flash')

const express_fileupload = require('express-fileupload')

//requiring admin routes
const adminRouter = require('./routes/adminRouter');
const categoryRouter = require('./routes/category_router');
const productRouter = require('./routes/product_router');
const customerRouter = require('./routes/customer_router');
const salesRoute = require('./routes/sales_route');
const coupensRoute = require('./routes/coupen_route');
const bannerRoute = require('./routes/banner_route');
const notificationRoute = require('./routes/notification_route');
const newsRouter = require('./routes/newsRouter');
const chatRouter = require('./routes/chatRouter');

//user routers 
const userRouter = require('./routes/userRouter');
const myAccountRouter = require('./routes/myAccountRouter');
const orderRouter = require('./routes/orderRouter');
const cartRouter = require('./routes/cartRouter');
const productSearchRouter = require('./routes/productSearchRoute');
const reviewRouter = require('./routes/reviewRouter');


//connect database
dbConnect();

//body-Parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

// app.use(express_fileupload())
//connect flash
app.use(flash())

//setting  us the view engine 
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');
app.use(express.static(publicDirectoryPath))

const xhbs = hbs.create({
  layoutsDir: __dirname + '/views/layouts',
  extname: 'hbs',
  runtimeOptions: {
    allowProtoPropertiesByDefault: true,
    allowProtoMethodsByDefault: true,
  },
  defaultLayout: 'layout',
  partialsDir: __dirname + '/views/partials/'
});

app.engine('hbs', xhbs.engine);

handlebars.registerHelper('toDateAndTime', function (date) {
  date = new Date(date);
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // Months are zero-based, so add 1
  const day = date.getDate();

  const timeString = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false
  });

  return `${day}-${month}-${year} ${timeString}`;
});

handlebars.registerHelper('checkSatatus', function (status, options) {
  if (status == "Debit") {
    return options.fn(this);
  } else {
    return options.inverse(this);
  }
})

// Helpers used by news views
handlebars.registerHelper('inc', function (v) { return Number(v) + 1; });
handlebars.registerHelper('dec', function (v) { return Number(v) - 1; });
handlebars.registerHelper('gt', function (a, b) { return Number(a) > Number(b); });
handlebars.registerHelper('lt', function (a, b) { return Number(a) < Number(b); });
handlebars.registerHelper('eq', function (a, b) { return String(a) === String(b); });
handlebars.registerHelper('json', function (context) { return JSON.stringify(context); });

// Currency formatting: Vietnamese đồng with thousand separators
handlebars.registerHelper('formatVND', function (value) {
  const num = Number(value) || 0;
  return num.toLocaleString('vi-VN') + ' vnđ';
});

app.use(session({
  secret: 'secrekeey',
  resave: false,
  maxAge: 1000 * 60 * 60,
  saveUninitialized: true
}))


//clearing the cache of browser
app.use(nocache());

//user router
app.use('/', userRouter);
app.use('/my-account', myAccountRouter);
app.use('/cart', cartRouter);
app.use('/orders', orderRouter);
app.use('/products', productSearchRouter);
app.use('/reviews', reviewRouter);
app.use('/', newsRouter);
app.use('/chat', chatRouter);


//admin router
app.use('/admin', adminRouter);
app.use('/admin/categories', categoryRouter);
app.use('/admin/products', productRouter);
app.use('/admin/customers', customerRouter);
app.use('/admin/sales-report', salesRoute);
app.use('/admin/coupens', coupensRoute);
app.use('/admin/banners', bannerRoute);
app.use('/admin/notificatons', notificationRoute);

//error handling
app.use(notFound);
app.use(errorHandler)

//server listening to the port
server.listen(PORT, () => {
  console.log(`server is running at port ${PORT}`)
})

// Expose io to routes/controllers
app.set('io', io);

// Socket.IO minimal chat handling
const Message = require('./models/messageModel');
const Admin = require('./models/adminModel');

io.on('connection', (socket) => {
  console.log('[socket] client connected', socket.id);
  socket.on('join', ({ userId, role }) => {
    console.log('[socket] join', { userId, role, socket: socket.id });
    if (userId) {
      socket.join(`user:${userId}`);
      console.log('[socket] joined room', `user:${userId}`);
    }
    if (role === 'admin') {
      socket.join('admins');
      console.log('[socket] joined room admins');
    }
  });

  socket.on('chat:message', async ({ fromUserId, fromAdminId, toUserId, content, senderRole }) => {
    try {
      if (!content) return;
      console.log('[socket] chat:message recv', { fromUserId, fromAdminId, toUserId, senderRole, content });
      let senderId, senderModel, recipientId, recipientModel;
      if (senderRole === 'admin') {
        // Persist admin message and emit unified payload
        senderId = fromAdminId;
        senderModel = 'Admin';
        recipientId = toUserId;
        recipientModel = 'User';
        if (!senderId || !recipientId) {
          console.warn('[socket] missing IDs for admin message', { senderId, recipientId });
          return;
        }
        const msg = await Message.create({ senderId, senderModel, recipientId, recipientModel, content });
        console.log('[socket] persist admin msg', msg._id);
        io.to(`user:${recipientId}`).emit('chat:message', { ...msg.toObject() });
        io.to('admins').emit('chat:message', { ...msg.toObject() });
        return;
      } else {
        senderId = fromUserId;
        senderModel = 'User';
        const admin = await Admin.findOne().select('_id');
        recipientId = admin ? admin._id : undefined;
        recipientModel = 'Admin';
      }
      const msg = await Message.create({ senderId, senderModel, recipientId, recipientModel, content });
      console.log('[socket] persist msg', msg._id);
      console.log('[socket] emit to user room', `user:${fromUserId}`);
      io.to(`user:${fromUserId}`).emit('chat:message', { ...msg.toObject() });
      console.log('[socket] emit to admins');
      io.to('admins').emit('chat:message', { ...msg.toObject() });
    } catch (e) {
      console.error('chat:message error', e);
    }
  });
});
