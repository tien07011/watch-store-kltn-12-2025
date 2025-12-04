const mongoose = require('mongoose');

const NewsSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    summary: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    coverImage: { type: String },
    tags: [{ type: String }],
    author: { type: String, default: 'Admin' },
    status: { type: String, enum: ['draft', 'published'], default: 'published' },
    publishedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('News', NewsSchema);
