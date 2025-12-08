const News = require('../models/newsModel');

function toSlug(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

exports.list = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = 10;
    const skip = (page - 1) * limit;
    const [items, count] = await Promise.all([
      News.find({ status: 'published' })
        .sort({ publishedAt: -1 })
        .skip(skip)
        .limit(limit),
      News.countDocuments({ status: 'published' }),
    ]);
    const totalPages = Math.max(1, Math.ceil(count / limit));
    res.render('news/news-list', {
      items,
      page,
      totalPages,
      title: 'Tin tức',
      user: true,
      footer: true,
    });
  } catch (err) {
    next(err);
  }
};

exports.detail = async (req, res, next) => {
  try {
    const slug = req.params.slug;
    const item = await News.findOne({ slug, status: 'published' });
    if (!item) return res.status(404).render('error/404');
    res.render('news/news-detail', { item, title: item.title, user: true, footer: true });
  } catch (err) {
    next(err);
  }
};

// Admin
exports.adminList = async (req, res, next) => {
  try {
    const items = await News.find({}).sort({ createdAt: -1 });
    res.render('admin/news-list', { items, title: 'Quản lý tin tức', admin: true, Admin: res.locals.admin, footer: false });
  } catch (err) {
    next(err);
  }
};

exports.newForm = (req, res) => {
  res.render('admin/new-news', { title: 'Thêm tin tức', admin: true, Admin: res.locals.admin, footer: false });
};

exports.create = async (req, res, next) => {
  try {
    const { title, summary, content, tags, status } = req.body;
    const slug = toSlug(title);
    const coverImage = req.file ? `/images/news/${req.file.filename}` : undefined;
    const tagList = (tags || '')
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t);
    const exists = await News.findOne({ slug });
    const finalSlug = exists ? `${slug}-${Date.now()}` : slug;
    await News.create({ title, slug: finalSlug, summary, content, coverImage, tags: tagList, status });
    res.redirect('/admin/news');
  } catch (err) {
    next(err);
  }
};

exports.editForm = async (req, res, next) => {
  try {
    const id = req.params.id;
    const item = await News.findById(id);
    if (!item) return res.status(404).render('error/404');
    res.render('admin/edit-news', { item, title: 'Sửa tin tức', admin: true, Admin: res.locals.admin, footer: false });
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const id = req.params.id;
    const { title, summary, content, tags, status } = req.body;
    const tagList = (tags || '')
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t);
    const updateData = { title, summary, content, tags: tagList, status };
    if (req.file) updateData.coverImage = `/images/news/${req.file.filename}`;
    // if title changes, update slug
    if (title) {
      const newSlug = toSlug(title);
      const exists = await News.findOne({ slug: newSlug, _id: { $ne: id } });
      updateData.slug = exists ? `${newSlug}-${Date.now()}` : newSlug;
    }
    await News.findByIdAndUpdate(id, updateData);
    res.redirect('/admin/news');
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const id = req.params.id;
    await News.findByIdAndDelete(id);
    res.redirect('/admin/news');
  } catch (err) {
    next(err);
  }
};
