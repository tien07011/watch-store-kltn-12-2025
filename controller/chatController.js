const Message = require('../models/messageModel');
const User = require('../models/userModel');
const Admin = require('../models/adminModel');

// Get conversation messages between a user and admin
exports.getConversation = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const limit = Number(req.query.limit || 50);
    const messages = await Message.find({
      $or: [
        { senderId: userId, senderModel: 'User', recipientModel: 'Admin' },
        { recipientId: userId, recipientModel: 'User', senderModel: 'Admin' },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.json({ ok: true, messages: messages.reverse() });
  } catch (err) {
    next(err);
  }
};

// Get conversation for the currently authenticated user
exports.getMyConversation = async (req, res, next) => {
  try {
    const user = res.locals.userData;
    if (!user || !user._id) {
      return res.status(401).json({ ok: false, message: 'Unauthorized' });
    }

    const limit = Number(req.query.limit || 50);
    const userId = String(user._id);
    const messages = await Message.find({
      $or: [
        { senderId: userId, senderModel: 'User', recipientModel: 'Admin' },
        { recipientId: userId, recipientModel: 'User', senderModel: 'Admin' },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.json({ ok: true, messages: messages.reverse() });
  } catch (err) {
    next(err);
  }
};

// List users who have messaged (for admin dashboard)
exports.listConversations = async (req, res, next) => {
  try {
    const pipeline = [
      {
        $match: {
          $or: [
            { senderModel: 'User' },
            { recipientModel: 'User' },
          ],
        },
      },
      {
        $project: {
          userId: {
            $cond: [
              { $eq: ['$senderModel', 'User'] },
              '$senderId',
              '$recipientId',
            ],
          },
          createdAt: 1,
        },
      },
      { $group: { _id: '$userId', lastMessageAt: { $max: '$createdAt' } } },
      { $sort: { lastMessageAt: -1 } },
    ];

    const convs = await Message.aggregate(pipeline);
    const users = await User.find({ _id: { $in: convs.map((c) => c._id) } })
      .select('_id name email')
      .lean();

    const map = new Map(users.map((u) => [String(u._id), u]));
    const result = convs.map((c) => ({
      user: map.get(String(c._id)),
      lastMessageAt: c.lastMessageAt,
    }));

    res.json({ ok: true, conversations: result });
  } catch (err) {
    next(err);
  }
};

// Post a message (fallback REST; sockets preferred)
exports.postMessage = async (req, res, next) => {
  try {
    const { toUserId, content } = req.body;
    const isAdmin = Boolean(res.locals.admin);

    if (!content || (!toUserId && !res.locals.userData)) {
      return res.status(400).json({ ok: false, message: 'Invalid payload' });
    }

    let senderId, senderModel, recipientId, recipientModel;

    if (isAdmin) {
      senderId = res.locals.admin._id;
      senderModel = 'Admin';
      recipientId = toUserId;
      recipientModel = 'User';
    } else {
      senderId = res.locals.userData._id;
      senderModel = 'User';
      // Assuming only chatting with admin (single admin)
      const admin = await Admin.findOne().select('_id');
      if (!admin) return res.status(500).json({ ok: false, message: 'Admin not found' });
      recipientId = admin._id;
      recipientModel = 'Admin';
    }

    const msg = await Message.create({
      senderId,
      senderModel,
      recipientId,
      recipientModel,
      content,
    });

    // Emit via Socket.IO if available
    try {
      const io = req.app.get('io');
      if (io) {
        if (senderModel === 'Admin') {
          io.to(`user:${recipientId}`).emit('chat:message', { ...msg.toObject() });
          io.to('admins').emit('chat:message', { ...msg.toObject() });
        } else {
          io.to(`user:${senderId}`).emit('chat:message', { ...msg.toObject() });
          io.to('admins').emit('chat:message', { ...msg.toObject() });
        }
      }
    } catch (_) {}

    res.json({ ok: true, message: msg });
  } catch (err) {
    next(err);
  }
};

// Post an image message
exports.postImageMessage = async (req, res, next) => {
  try {
    const file = req.file;
    const isAdmin = Boolean(res.locals.admin);
    const toUserId = req.body.toUserId;

    if (!file) {
      return res.status(400).json({ ok: false, message: 'No image uploaded' });
    }

    let senderId, senderModel, recipientId, recipientModel;
    if (isAdmin) {
      if (!toUserId) return res.status(400).json({ ok: false, message: 'Missing recipient userId' });
      senderId = res.locals.admin._id;
      senderModel = 'Admin';
      recipientId = toUserId;
      recipientModel = 'User';
    } else {
      if (!res.locals.userData) return res.status(401).json({ ok: false, message: 'Unauthorized' });
      senderId = res.locals.userData._id;
      senderModel = 'User';
      const admin = await Admin.findOne().select('_id');
      if (!admin) return res.status(500).json({ ok: false, message: 'Admin not found' });
      recipientId = admin._id;
      recipientModel = 'Admin';
    }

    const imageUrl = `/images/chat/${file.filename}`;
    const msg = await Message.create({
      senderId,
      senderModel,
      recipientId,
      recipientModel,
      imageUrl,
      imageMime: file.mimetype,
      imageSize: file.size,
    });

    // Emit via Socket.IO if available
    try {
      const io = req.app.get('io');
      if (io) {
        if (senderModel === 'Admin') {
          io.to(`user:${recipientId}`).emit('chat:message', { ...msg.toObject() });
          io.to('admins').emit('chat:message', { ...msg.toObject() });
        } else {
          io.to(`user:${senderId}`).emit('chat:message', { ...msg.toObject() });
          io.to('admins').emit('chat:message', { ...msg.toObject() });
        }
      }
    } catch (_) {}

    res.json({ ok: true, message: msg });
  } catch (err) {
    next(err);
  }
};
