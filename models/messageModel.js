const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema(
  {
    senderId: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'senderModel' },
    senderModel: { type: String, required: true, enum: ['User', 'Admin'] },
    recipientId: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'recipientModel' },
    recipientModel: { type: String, required: true, enum: ['User', 'Admin'] },
    content: { type: String, trim: true },
    imageUrl: { type: String, trim: true },
    imageMime: { type: String, trim: true },
    imageSize: { type: Number },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

MessageSchema.index({ senderId: 1, recipientId: 1, createdAt: 1 });

module.exports = mongoose.model('Message', MessageSchema);
