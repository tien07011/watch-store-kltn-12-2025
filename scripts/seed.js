/* Vietnamese fake data seeder using images from public/ */
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const { fakerVI } = require('@faker-js/faker');
const bcrypt = require('bcrypt');

const connect = require(path.join(__dirname, '..', 'config', 'dbConnection'));

// Models
const Category = require(path.join(__dirname, '..', 'models', 'categoryModel'));
const Product = require(path.join(__dirname, '..', 'models', 'productModel'));
const Banner = require(path.join(__dirname, '..', 'models', 'bannerModel'));
const User = require(path.join(__dirname, '..', 'models', 'userModel'));
const Order = require(path.join(__dirname, '..', 'models', 'orderModel'));
const Review = require(path.join(__dirname, '..', 'models', 'reviewRatingmodel'));
const Address = require(path.join(__dirname, '..', 'models', 'addressModel'));
const Admin = require(path.join(__dirname, '..', 'models', 'adminModel'));
const Coupon = require(path.join(__dirname, '..', 'models', 'coupenSchema'));
const OTP = require(path.join(__dirname, '..', 'models', 'otpModel'));
const Payment = require(path.join(__dirname, '..', 'models', 'paymentModel'));
const ReturnReq = require(path.join(__dirname, '..', 'models', 'returnSchema'));
const News = require(path.join(__dirname, '..', 'models', 'newsModel'));

function listImages(relativeDir) {
  const absolute = path.join(__dirname, '..', 'public', relativeDir);
  if (!fs.existsSync(absolute)) return [];
  return fs.readdirSync(absolute)
    .filter((f) => /\.(png|jpe?g|webp|gif)$/i.test(f))
    .map((f) => path.join(relativeDir, f));
}

async function seed(options = {}) {
  const {
    categoryCount = 6,
    productCount = 10,
    bannerCount = 4,
    userCount = 10,
    reviewCount = 30,
    orderCount = 12,
    addressPerUser = 2,
    adminCount = 2,
    couponCount = 5,
    otpCount = 5,
    paymentCount = 12,
    returnCount = 6,
    newsCount = 8,
    dropExisting = false,
  } = options;

  await connect();

  if (dropExisting) {
    await Promise.all([
      Category.deleteMany({}),
      Product.deleteMany({}),
      Banner.deleteMany({}),
      User.deleteMany({}),
      Order.deleteMany({}),
      Review.deleteMany({}),
      Address.deleteMany({}),
      Admin.deleteMany({}),
      Coupon.deleteMany({}),
      OTP.deleteMany({}),
      Payment.deleteMany({}),
      ReturnReq.deleteMany({}),
      News.deleteMany({}),
    ]);
  }

  const productImages = listImages('productImages');
  const bannerImages = listImages('banners');
  const newsImages = listImages('images/news');

  // Precompute a known bcrypt hash for password "123456"
  const defaultPasswordHash = bcrypt.hashSync('123456', 10);

  // Categories
  const categories = [
    {
      cat_name: 'Đồng hồ nam',
      description: 'Sản phẩm dành cho nam',
      cat_status: true,
    },
    {
      cat_name: 'Đồng hồ nữ',
      description: 'Sản phẩm dành cho nữ',
      cat_status: true,
    },
  ];

  const createdCategories = await Category.insertMany(categories);

  // Products
  const products = [];
  for (let i = 0; i < productCount; i++) {
    const cat = fakerVI.helpers.arrayElement(createdCategories);
    const title = fakerVI.commerce.productName();
    const price = Number(fakerVI.commerce.price({ min: 50000, max: 3000000 }));
    const stock = fakerVI.number.int({ min: 10, max: 200 });

    const primary = fakerVI.helpers.arrayElement(productImages) || 'images/no-image.jpg';
    const secondaryCount = fakerVI.number.int({ min: 0, max: 3 });
    const secondary = Array.from({ length: secondaryCount }, () => {
      const p = fakerVI.helpers.arrayElement(productImages) || primary;
      return { name: path.basename(p), path: p };
    });

    products.push({
      product_name: title,
      brand_name: fakerVI.company.name(),
      description: fakerVI.lorem.paragraph(),
      category_id: cat._id,
      stock,
      primary_image: { name: path.basename(primary), path: primary },
      secondary_images: secondary,
      actual_price: String(price),
      selling_price: String(fakerVI.number.int({ min: Math.floor(price * 0.6), max: Math.floor(price * 0.95) })),
      color: fakerVI.color.human(),
      GST: fakerVI.number.int({ min: 5, max: 18 }),
      status: true,
    });
  }
  const createdProducts = await Product.insertMany(products);

  // Banners
  const banners = Array.from({ length: bannerCount }, () => {
    const p = fakerVI.helpers.arrayElement(bannerImages) || 'banners/banner.jpg';
    const fname = path.basename(p);
    return {
      banner_name: fakerVI.company.catchPhrase(),
      image: { filename: fname, originalname: fname, path: p },
      reference: fakerVI.lorem.sentence(),
      banner_status: true,
    };
  });
  await Banner.insertMany(banners);

  // Users
  const users = Array.from({ length: userCount }, () => ({
    user_name: fakerVI.person.fullName(),
    user_email: fakerVI.internet.email({ provider: 'gmail.com' }),
    user_mobile: '0' + fakerVI.number.int({ min: 900000000, max: 989999999 }),
    user_password: defaultPasswordHash,
    user_status: true,
    is_delete: false,
    user_wallet: 0,
    wallet_history: [],
    cart: [],
    wish_list: [],
  }));
  const createdUsers = await User.insertMany(users);

  // Addresses (each user multiple addresses)
  const addresses = [];
  for (const u of createdUsers) {
    for (let i = 0; i < addressPerUser; i++) {
      addresses.push({
        customer_id: u._id,
        address_cust_name: u.user_name,
        address_type: fakerVI.helpers.arrayElement(['Nhà', 'Cơ quan']),
        phone: u.user_mobile,
        pincode: Number(fakerVI.location.zipCode()),
        locality: fakerVI.location.county(),
        house_name: fakerVI.location.streetAddress(),
        area_street: fakerVI.location.street(),
        town: fakerVI.location.city(),
        state: fakerVI.location.state(),
        alternate_phone: '0' + fakerVI.number.int({ min: 900000000, max: 989999999 }),
        landmark: fakerVI.location.nearbyGPSCoordinate().join(', '),
        delete: false,
      });
    }
  }
  const createdAddresses = await Address.insertMany(addresses);

  // Reviews
  const reviews = Array.from({ length: reviewCount }, () => ({
    user_id: fakerVI.helpers.arrayElement(createdUsers)._id,
    product_id: fakerVI.helpers.arrayElement(createdProducts)._id,
    comment: fakerVI.lorem.sentence(),
    rating: fakerVI.number.int({ min: 1, max: 5 }),
  }));
  await Review.insertMany(reviews);

  // Orders
  const orders = [];
  for (let i = 0; i < orderCount; i++) {
    const customer = fakerVI.helpers.arrayElement(createdUsers);
    const itemCount = fakerVI.number.int({ min: 1, max: 4 });
    const items = [];
    let total = 0;
    for (let k = 0; k < itemCount; k++) {
      const prod = fakerVI.helpers.arrayElement(createdProducts);
      const qty = fakerVI.number.int({ min: 1, max: 3 });
      const price = Number(prod.selling_price);
      total += price * qty;
      items.push({
        product_id: prod._id,
        quantity: qty,
        price,
        status: fakerVI.helpers.arrayElement(['Ordered', 'Shipped', 'Delivered']),
      });
    }
    const addr = {
      name: customer.user_name,
      mobile: customer.user_mobile,
      house_name: fakerVI.location.streetAddress(),
      street: fakerVI.location.street(),
      city: fakerVI.location.city(),
      pincode: fakerVI.location.zipCode(),
      state: fakerVI.location.state(),
    };
    orders.push({
      customer_id: customer._id,
      items,
      address: addr,
      payment_method: fakerVI.helpers.arrayElement(['COD', 'Online']),
      total_amount: total,
      status: fakerVI.helpers.arrayElement(['Placed', 'Processing', 'Completed']),
    });
  }
  const insertedOrders = await Order.insertMany(orders);

  // Admins
  const admins = Array.from({ length: adminCount }, () => ({
    first_name: fakerVI.person.firstName(),
    last_name: fakerVI.person.lastName(),
    email: fakerVI.internet.email({ provider: 'company.vn' }),
    mobile: '0' + fakerVI.number.int({ min: 900000000, max: 989999999 }),
    password: defaultPasswordHash,
  }));
  const createdAdmins = await Admin.insertMany(admins);

  // Coupons
  const coupons = Array.from({ length: couponCount }, () => ({
    coupon_code: fakerVI.string.alphanumeric({ length: 8 }).toUpperCase(),
    discount: fakerVI.number.int({ min: 5, max: 30 }),
    start_date: fakerVI.date.recent({ days: 10 }),
    exp_date: fakerVI.date.soon({ days: 30 }),
    min_amount: fakerVI.number.int({ min: 100000, max: 500000 }),
    max_count: fakerVI.number.int({ min: 50, max: 500 }),
    used_count: 0,
    discription: fakerVI.lorem.sentence(),
    is_delete: false,
    user_list: fakerVI.helpers.arrayElements(createdUsers.map(u => u._id), fakerVI.number.int({ min: 0, max: createdUsers.length })),
  }));
  const createdCoupons = await Coupon.insertMany(coupons);

  // OTPs
  const otps = Array.from({ length: otpCount }, () => ({
    email: fakerVI.internet.email(),
    otp: fakerVI.string.numeric(6),
    createdAt: new Date(),
  }));
  await OTP.insertMany(otps);

  // Payments (link to orders)
  const payments = [];
  for (let i = 0; i < Math.min(paymentCount, insertedOrders.length); i++) {
    payments.push({
      payment_id: fakerVI.string.uuid(),
      amount: insertedOrders[i].total_amount,
      currency: 'VND',
      payment_method: insertedOrders[i].payment_method,
      status: fakerVI.helpers.arrayElement(['created', 'paid', 'failed']),
      order_id: insertedOrders[i]._id,
      created_at: new Date(),
    });
  }
  await Payment.insertMany(payments);

  // Returns
  const returns = Array.from({ length: returnCount }, () => {
    const ord = fakerVI.helpers.arrayElement(insertedOrders);
    const it = fakerVI.helpers.arrayElement(ord.items);
    const user = createdUsers.find(u => String(u._id) === String(ord.customer_id)) || fakerVI.helpers.arrayElement(createdUsers);
    return {
      order_id: ord._id,
      product_id: it.product_id,
      user_id: user._id,
      reason: fakerVI.helpers.arrayElement(['Hàng lỗi', 'Không đúng mẫu', 'Không hài lòng']),
      status: fakerVI.helpers.arrayElement(['Requested', 'Approved', 'Rejected']),
      comment: fakerVI.lorem.sentence(),
    };
  });
  await ReturnReq.insertMany(returns);

  // News
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
  const news = Array.from({ length: newsCount }, () => {
    const title = fakerVI.lorem.sentence({ min: 3, max: 8 });
    const cover = (newsImages && newsImages.length)
      ? fakerVI.helpers.arrayElement(newsImages)
      : null;
    return {
      title,
      slug: toSlug(title) + '-' + fakerVI.string.alphanumeric(6).toLowerCase(),
      summary: fakerVI.lorem.sentences({ min: 2, max: 3 }),
      content: `<p>${fakerVI.lorem.paragraphs({ min: 2, max: 5 }).replace(/\n/g, '</p><p>')}</p>`,
      coverImage: cover ? `/${cover.replace(/\\/g, '/')}` : undefined,
      tags: fakerVI.helpers.arrayElements(['khuyến mãi', 'bộ sưu tập', 'mẹo chọn đồng hồ', 'tin công nghệ', 'bảo hành'], fakerVI.number.int({ min: 1, max: 3 })),
      author: fakerVI.person.fullName(),
      status: fakerVI.helpers.arrayElement(['published', 'draft']),
      publishedAt: fakerVI.date.recent({ days: 20 }),
    };
  });
  await News.insertMany(news);

  console.log('✅ Seed dữ liệu tiếng Việt đã hoàn tất.');
  await mongoose.connection.close();
}

(function run() {
  const argv = process.argv.slice(2);
  const opts = { dropExisting: argv.includes('--drop') };
  const numArg = /^--(products|categories|banners|users|reviews|orders|addresses|admins|coupons|otps|payments|returns)=(\d+)$/;
  for (const arg of argv) {
    const m = arg.match(numArg);
    if (m) {
      const key = m[1];
      const value = parseInt(m[2], 10);
      const map = {
        products: 'productCount',
        categories: 'categoryCount',
        banners: 'bannerCount',
        users: 'userCount',
        reviews: 'reviewCount',
        orders: 'orderCount',
        addresses: 'addressPerUser',
        admins: 'adminCount',
        coupons: 'couponCount',
        otps: 'otpCount',
        payments: 'paymentCount',
        returns: 'returnCount',
      };
      opts[map[key]] = value;
    }
  }
  // Custom arg for news count
  const newsArg = argv.find(a => a.startsWith('--news='));
  if (newsArg) {
    const v = parseInt(newsArg.split('=')[1], 10);
    if (!Number.isNaN(v)) opts.newsCount = v;
  }
  seed(opts).catch((err) => { console.error('Seed lỗi:', err); process.exit(1); });
})();
