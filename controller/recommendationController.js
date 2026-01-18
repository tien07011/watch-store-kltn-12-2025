const mongoose = require('mongoose');
const Product = require('../models/productModel');
const Order = require('../models/orderModel');
const Review = require('../models/reviewRatingmodel');

// Compute AI-like recommendations based on user's cart and order history
// Strategy: content-based scoring + popularity and rating signals
const get_recommendations = async (req, res) => {
  try {
    const user = res.locals.userData;
    if (!user || !user._id) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const userId = new mongoose.Types.ObjectId(user._id);
    const limit = Math.min(Number(req.query.limit) || 8, 20);

    // 1) Collect seen product IDs from cart and orders
    const cartIds = (user.cart || []).map((c) => c.product_id).filter(Boolean);

    const orders = await Order.aggregate([
      { $match: { customer_id: userId } },
      { $unwind: '$items' },
      {
        $project: {
          product_id: '$items.product_id',
          status: '$items.status',
        },
      },
    ]);
    const historyIds = orders.map((o) => o.product_id).filter(Boolean);
    const seenSet = new Set([...cartIds.map(String), ...historyIds.map(String)]);

    // 2) Derive user preference signals: category frequency and brand frequency
    const seenProducts = await Product.find({ _id: { $in: [...seenSet].map((id) => new mongoose.Types.ObjectId(id)) } }).select(
      'category_id brand_name'
    );
    const catCount = new Map();
    const brandCount = new Map();
    for (const p of seenProducts) {
      const cat = String(p.category_id);
      const brand = (p.brand_name || '').trim();
      catCount.set(cat, (catCount.get(cat) || 0) + 1);
      if (brand) brandCount.set(brand, (brandCount.get(brand) || 0) + 1);
    }
    const categories = [...catCount.keys()].map((id) => new mongoose.Types.ObjectId(id));

    if (!categories.length) {
      // Fallback: recommend popular active products
      const popular = await Product.find({ delete: false, status: true })
        .select('product_name brand_name selling_price primary_image category_id')
        .limit(limit)
        .lean();
      return res.json({ success: true, items: popular });
    }

    // 3) Candidates: products in preferred categories, exclude seen
    const candidates = await Product.find({
      category_id: { $in: categories },
      delete: false,
      status: true,
    })
      .select('product_name brand_name selling_price primary_image category_id')
      .lean();

    const filtered = candidates.filter((p) => !seenSet.has(String(p._id)));
    const candidateIds = filtered.map((p) => p._id);
    if (!candidateIds.length) {
      return res.json({ success: true, items: [] });
    }

    // 4) Ratings and popularity signals
    const ratingsAgg = await Review.aggregate([
      { $match: { product_id: { $in: candidateIds } } },
      { $group: { _id: '$product_id', avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    const ratingMap = new Map(ratingsAgg.map((r) => [String(r._id), { avg: r.avg || 0, count: r.count || 0 }]));

    const popAgg = await Order.aggregate([
      { $unwind: '$items' },
      { $match: { 'items.product_id': { $in: candidateIds } } },
      { $group: { _id: '$items.product_id', cnt: { $sum: 1 } } },
    ]);
    const popMap = new Map(popAgg.map((r) => [String(r._id), r.cnt || 0]));

    const maxCat = Math.max(1, ...[...catCount.values()]);
    const maxBrand = Math.max(1, ...[...brandCount.values()]);
    const maxPop = Math.max(1, ...[...popMap.values()]);

    // 5) Score candidates
    const scored = filtered.map((p) => {
      const catScore = (catCount.get(String(p.category_id)) || 0) / maxCat; // 0..1
      const brandScore = (brandCount.get((p.brand_name || '').trim()) || 0) / maxBrand; // 0..1
      const r = ratingMap.get(String(p._id)) || { avg: 0, count: 0 };
      const ratingScore = Math.min(1, (r.avg || 0) / 5);
      const popularityScore = (popMap.get(String(p._id)) || 0) / maxPop;

      // Weighted sum
      const score = 0.45 * catScore + 0.25 * brandScore + 0.2 * ratingScore + 0.1 * popularityScore;
      return { ...p, _score: score, _signals: { catScore, brandScore, ratingScore, popularityScore } };
    });

    scored.sort((a, b) => b._score - a._score);
    const top = scored.slice(0, limit).map(({ _score, _signals, ...rest }) => rest);
    return res.json({ success: true, items: top });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

module.exports = {
  get_recommendations,
};
