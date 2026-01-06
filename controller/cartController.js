//requireiing all models
const Address = require('../models/addressModel');
const Order = require('../models/orderModel');
const Product = require('../models/productModel');
const User = require('../models/userModel');
const Payment = require('../models/paymentModel');
const Coupen = require('../models/coupenSchema');
const mongoose = require('mongoose');

const crypto = require('crypto');
const https = require('https');
const momoConfig = require('../config/momoConfig');


//adding item to cart
const addProductToCart = async (userID, productId) => {
    const user = await User.findOne({ _id: userID, 'cart.product_id': productId });
    if (user) {
        return false;
    } else {

        const cart = {
            $push: {
                cart: {
                    product_id: productId,
                    quantity: 1
                }
            }
        };
        const updatedCart = await User.findByIdAndUpdate({ _id: userID }, cart, { new: true });
        return updatedCart;
    }
}


//adding product to cart
const add_product_to_cart = async (req, res) => {
    let productId = req.params.id;
    let userID = res.locals.userData._id;
    let updatedUser = await addProductToCart(userID, productId);
    if (updatedUser) {
        let cartCount = updatedUser.cart.length;
        res.json({
            status: true,
            count: cartCount
        });
    } else {
        res.json({
            status: false
        })
    }

}
//render cart
const render_cart_page = async (req, res) => {

    let userData = res.locals.userData

    let userid = userData._id;
    let cartList = await User.aggregate([
        { $match: { _id: userid } },
        { $project: { cart: 1, _id: 0 } },
        { $unwind: { path: '$cart' } },
        {
            $lookup: {
                from: 'products',
                localField: 'cart.product_id',
                foreignField: '_id',
                as: 'prod_detail'
            }
        },
        { $unwind: { path: '$prod_detail' } },
    ])
    for (prod of cartList) {
        prod.price = prod.prod_detail.selling_price * prod.cart.quantity
    }

    let totalPrice = 0;
    for (let i = 0; i < cartList.length; i++) {
        totalPrice = totalPrice + cartList[i].price;
    }

    let cartCount = userData.cart.length;

    if (cartCount > 0) {
        res.render('user/cart', { user: true, cartList, cartCount, totalPrice, footer: true })
    } else {
        res.render('user/emptyCart', { user: true, footer: true })

    }
}


//remove item from cart list
const remove_product_from_cart = async (req, res) => {
    let id = req.params.id;
    let userId = res.locals.userData._id
    await User.updateOne({ _id: userId }, { $pull: { cart: { product_id: id } } })
    res.json({
        status: true
    })
}


//increment item count by one
const incrementQuantity = async (req, res) => {
    let userID = res.locals.userData._id;
    const productId = req.params.id;
    let user = await User.findOne({ _id: userID })
    const stock = await Product.findOne({ _id: productId }, { stock: 1, _id: 0 })
    const currentQuantity = user.cart.find(item => item.product_id == productId)
    let currentStock = stock.stock
    let quantity = currentQuantity.quantity;

    if (quantity > currentStock - 1) {
        res.json({
            success: false
        })
    } else {
        const updated = await User.updateOne(
            {
                _id: userID,
                'cart.product_id': productId
            },
            {
                $inc: {
                    'cart.$.quantity': 1
                }
            }
        );
        if (updated) {
            res.json({
                success: true
            })
        }
    }

}

//decrement item by one 
const minus_cart_quantity = async (req, res) => {
    let userID = res.locals.userData._id;
    const productId = req.params.id;

    const updated = await User.updateOne(
        {
            _id: userID,
            'cart.product_id': productId
        },
        {
            $inc: {
                'cart.$.quantity': -1
            }
        }
    );
    if (updated) {
        res.json({
            success: true
        })
    }
}

//render checkout page  
const render_checkout = async (req, res) => {
    let userId = res.locals.userData._id;
    const address = await Address.find({ customer_id: userId, delete: false });
    // Limit to selected items if provided
    const selectedItemsParam = (req.query.items || '').trim();
    let selectedSet = null;
    if (selectedItemsParam) {
        selectedSet = new Set(String(selectedItemsParam).split(',').map(s => s.trim()).filter(Boolean));
    }
    let cart = res.locals.userData.cart
    if (selectedSet) {
        cart = cart.filter(it => selectedSet.has(String(it.product_id)));
    }
    let sellingPrice = [];
    for (let i = 0; i < cart.length; i++) {
        let sellingprice = await Product.find({ _id: cart[i].product_id }, { _id: 0, selling_price: 1 });
        sellingPrice.push(sellingprice);
    }
    let selling = [].concat(...sellingPrice);
    let totalAmount = 0;
    for (let i = 0; i < cart.length; i++) {
        totalAmount = totalAmount + (parseInt(selling[i].selling_price) * cart[i].quantity)
    }
    let user = res.locals.userData
    let wallet;
    if (totalAmount <= user.user_wallet) {
        wallet = true;
    } else {
        wallet: false;
    }
    let user_id = user._id;

    // fetching all availabe coupens from db
    let coupens = await Coupen.aggregate([{
        $match: {
            start_date: { $lte: new Date() },
            exp_date: { $gte: new Date() },
            is_delete: false,
            $expr: {
                $and: [
                    { $ne: ["$max_count", "$used_count"] },
                    { $not: { $in: [user_id, "$user_list"] } }

                ],
            }
        }
    }]);
    function formatDateString(inputDateString) {
        const dateObject = new Date(inputDateString);

        const year = dateObject.getUTCFullYear();
        const month = String(dateObject.getUTCMonth() + 1).padStart(2, '0');
        const day = String(dateObject.getUTCDate()).padStart(2, '0');

        const formattedDate = `${day}-${month}-${year}`;
        return formattedDate;
    }
    coupens.forEach((e) => {
        e.exp_date = formatDateString(e.exp_date);
    })

    if (req.query.coupen) {
        const total = req.query.total;
        const coupen = await Coupen.findOne({ _id: req.query.coupen });
        if (coupen.min_amount <= total) {
            let dicount = coupen.discount;
            totalAmount = totalAmount - (totalAmount * dicount / 100);
            res.json({
                success: true,
                total: totalAmount,
                coupen_id: coupen._id,
                discount: coupen.discount,
                coupen_code: coupen.coupon_code
            });
        } else {
            res.json({
                success: false,
                min_amount: coupen.min_amount
            })
        }
    }


    // rendering to checkout page
    const selectedItems = selectedItemsParam || '';
    res.render('user/checkout', { user: true, coupens, wallet, user, address, cart, totalAmount, selectedItems, checkout: true });


}

//create order 
const place_order = async (req, res) => {
    try {
        const customer_id = res.locals.userData._id;
        const isConfirmed = (req.body.payment_method === 'COD' || req.body.payment_method === 'wallet');
        const status = isConfirmed ? 'confirmed' : 'pending';

        // Build cart list and optionally filter by selected items
        let cartList = await User.aggregate([
            { $match: { _id: customer_id } },
            { $project: { cart: 1, _id: 0 } },
            { $unwind: { path: '$cart' } },
            {
                $lookup: {
                    from: 'products',
                    localField: 'cart.product_id',
                    foreignField: '_id',
                    as: 'prod_detail'
                }
            },
            { $unwind: { path: '$prod_detail' } },
            {
                $project: {
                    'prod_detail_id': 1,
                    'prod_detail.selling_price': 1,
                    cart: 1
                }
            }
        ]);

        // Limit to selected items if provided
        const selectedItemsStr = (req.body.selectedItems || '').trim();
        let selectedSet = null;
        if (selectedItemsStr) {
            selectedSet = new Set(String(selectedItemsStr).split(',').map(s => s.trim()).filter(Boolean));
            cartList = cartList.filter(it => selectedSet.has(String(it.cart.product_id)));
        }

        let items = [];
        const address = await Address.findOne({ _id: req.body.address });

        let order;
        if (req.body.coupen != '') {
            const couponId = new mongoose.Types.ObjectId(req.body.coupen);
            const userId = res.locals.userData._id;
            if (isConfirmed) {
                await Coupen.findByIdAndUpdate(
                    { _id: couponId },
                    { $inc: { used_count: 1 }, $push: { user_list: userId } },
                    { new: true }
                );
            }
            const discount = req.body.discount;
            const coupen_code = req.body.coupen_code;
            for (let i = 0; i < cartList.length; i++) {
                const base = parseInt(cartList[i].prod_detail.selling_price);
                items.push({
                    product_id: cartList[i].cart.product_id,
                    quantity: cartList[i].cart.quantity,
                    price: base - (base * discount / 100),
                    status
                });
            }
            order = {
                customer_id,
                items,
                address,
                payment_method: req.body.payment_method,
                total_amount: parseInt(req.body.price),
                status,
                coupon: { coupon_id: couponId, discount, code: coupen_code }
            };
        } else {
            for (let i = 0; i < cartList.length; i++) {
                items.push({
                    product_id: cartList[i].cart.product_id,
                    quantity: cartList[i].cart.quantity,
                    price: parseInt(cartList[i].prod_detail.selling_price),
                    status
                });
            }
            order = {
                customer_id,
                items,
                address,
                status,
                payment_method: req.body.payment_method,
                total_amount: parseInt(req.body.price)
            };
        }

        if (req.body.payment_method === 'COD') {
            const created = await Order.create(order);
            if (created) {
                if (selectedSet && selectedSet.size) {
                    await User.updateOne({ _id: customer_id }, { $pull: { cart: { product_id: { $in: Array.from(selectedSet) } } } });
                } else {
                    await User.updateOne({ _id: customer_id }, { $unset: { cart: '' } });
                }
                for (let i = 0; i < items.length; i++) {
                    await Product.updateOne({ _id: items[i].product_id }, { $inc: { stock: -(items[i].quantity) } });
                }
                req.session.order = { status: true };
                return res.json({ success: true });
            }
        } else if (req.body.payment_method === 'wallet') {
            const created = await Order.create(order);
            if (created) {
                const user = res.locals.userData;
                if (selectedSet && selectedSet.size) {
                    await User.updateOne({ _id: customer_id }, { $pull: { cart: { product_id: { $in: Array.from(selectedSet) } } } });
                } else {
                    await User.updateOne({ _id: customer_id }, { $unset: { cart: '' } });
                }
                await User.updateOne({ _id: customer_id }, { $set: { user_wallet: parseInt(user.user_wallet) - parseInt(req.body.price) } });
                const newHistoryItem = { amount: parseInt(req.body.price), status: 'Debit', time: Date.now() };
                await User.findByIdAndUpdate({ _id: customer_id }, { $push: { wallet_history: newHistoryItem } }, { new: true });
                for (let i = 0; i < items.length; i++) {
                    await Product.updateOne({ _id: items[i].product_id }, { $inc: { stock: -(items[i].quantity) } });
                }
                req.session.order = { status: true };
                return res.json({ success: true });
            }
        } else {
            // Online via MoMo
            const createdOrder = await Order.create(order);
            const total = parseInt(req.body.price);
            const orderId = createdOrder._id.toString();

            let payment = new Payment({
                payment_id: orderId,
                amount: total,
                currency: 'VND',
                order_id: createdOrder._id,
                status: 'created',
                created_at: new Date().toISOString(),
                payment_method: 'Online Payment',
            });
            await payment.save();

            const baseUrl = `${req.protocol}://${req.get('host')}`;
            const returnUrl = `${baseUrl}/cart/momo-return`;
            const ipnUrl = `${baseUrl}/cart/momo-ipn`;
            const payUrl = await createMomoOrder({
                orderId,
                amount: total,
                returnUrl,
                ipnUrl,
                orderInfo: `Thanh toan don hang ${orderId}`,
                extraData: Buffer.from(`userId=${res.locals.userData._id}`).toString('base64'),
                requestType: 'captureWallet',
            });
            if (!payUrl) return res.status(500).json({ success: false, message: 'MoMo create payment failed' });
            return res.json({ status: true, payUrl });
        }

        return res.status(400).json({ success: false });
    } catch (err) {
        res.send(err.message);
    }
}

// Create MoMo order
const createMomoOrder = ({ orderId, amount, returnUrl, ipnUrl, orderInfo, extraData, requestType }) => {
    return new Promise((resolve) => {
        const requestId = `${orderId}-${Date.now()}`;
        const rawSignature = `accessKey=${momoConfig.accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${momoConfig.partnerCode}&redirectUrl=${returnUrl}&requestId=${requestId}&requestType=${requestType}`;
        const signature = crypto.createHmac('sha256', momoConfig.secretKey).update(rawSignature).digest('hex');

        const body = JSON.stringify({
            partnerCode: momoConfig.partnerCode,
            accessKey: momoConfig.accessKey,
            requestId,
            amount: `${amount}`,
            orderId,
            orderInfo,
            redirectUrl: returnUrl,
            ipnUrl,
            extraData,
            requestType,
            signature,
            lang: 'vi'
        });

        const url = new URL(momoConfig.endpoint);
        const options = {
            hostname: url.hostname,
            path: url.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data || '{}');
                    resolve(parsed.payUrl || null);
                } catch {
                    resolve(null);
                }
            });
        });
        req.on('error', () => resolve(null));
        req.write(body);
        req.end();
    });
};

//verifying payment (legacy Razorpay support if needed)
const verifyPaymenet = async (req, res) => {
    const hmac = crypto.createHmac('sha256', process.env.RAZ_SECRET_KEY);
    hmac.update(req.body.razorpay_order_id + '|' + req.body.razorpay_payment_id);
    let generatedSignature = hmac.digest('hex');
    let isSignatureValid = generatedSignature === req.body.razorpay_signature;

    if (isSignatureValid) {
        let customer_id = res.locals.userData._id;
        let items = res.locals.userData.cart;
        for (let i = 0; i < items.length; i++) {
            await Product.updateOne({ _id: items[i].product_id }, { $inc: { stock: -(items[i].quantity) } });
        }
        const selectedItemsStr = (req.body.selectedItems || '').trim();
        if (selectedItemsStr) {
            const set = new Set(String(selectedItemsStr).split(',').map(s => s.trim()).filter(Boolean));
            await User.updateOne({ _id: customer_id }, { $pull: { cart: { product_id: { $in: Array.from(set) } } } });
        } else {
            await User.updateOne({ _id: customer_id }, { $unset: { cart: '' } });
        }
        let paymentId = req.body.razorpay_order_id;
        const orderID = await Payment.findOne({ payment_id: paymentId }, { _id: 0, order_id: 1 });
        const order_id = orderID.order_id;
        await Order.updateOne({ _id: order_id }, { $set: { 'items.$[].status': 'confirmed', status: 'confirmed' } });
        let couponId = await Order.findOne({ _id: order_id }, { coupon: 1, _id: 0 });
        if (couponId) {
            couponId = couponId.coupon.coupon_id;
            if (couponId) {
                await Coupen.findByIdAndUpdate(
                    { _id: couponId },
                    { $inc: { used_count: 1 }, $push: { user_list: customer_id } },
                    { new: true }
                );
            }
        }
        req.session.order = { status: true };
        return res.json({ success: true });
    }
    return res.json({ success: false });
}

// MoMo return (user redirect)
const momoReturn = async (req, res) => {
    try {
        const { resultCode, orderId } = req.query;
        // Always check DB status; IPN is the source of truth
        if (orderId) {
            const order = await Order.findById(orderId).lean();
            if (order && String(order.status) === 'confirmed') {
                req.session.order = { status: true };
                return res.redirect('/cart/order-success');
            }
            // If not yet confirmed, show a pending page or redirect to orders
            // You may create a dedicated pending view; for now redirect to cart with a flash message
            req.flash('info', 'Thanh toán đang xử lý, vui lòng chờ trong giây lát.');
            return res.redirect('/');
        }
        return res.redirect('/');
    } catch {
        return res.redirect('/');
    }
};

// MoMo IPN (server callback)
const momoIpn = async (req, res) => {
    try {
        const {
            partnerCode,
            accessKey,
            amount,
            orderId,
            orderInfo,
            orderType,
            transId,
            resultCode,
            message,
            payType,
            requestId,
            responseTime,
            extraData,
            signature,
        } = req.body || {};

        if (partnerCode !== momoConfig.partnerCode || accessKey !== momoConfig.accessKey) {
            return res.status(400).json({ message: 'Invalid partner' });
        }

        if (signature) {
            const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData || ''}&message=${message || ''}&orderId=${orderId}&orderInfo=${orderInfo || ''}&orderType=${orderType || ''}&partnerCode=${partnerCode}&payType=${payType || ''}&requestId=${requestId}&responseTime=${responseTime || ''}&resultCode=${resultCode}&transId=${transId || ''}`;
            const expected = crypto.createHmac('sha256', momoConfig.secretKey).update(rawSignature).digest('hex');
            if (expected !== signature) {
                return res.status(400).json({ message: 'Invalid signature' });
            }
        }

        if (String(resultCode) === '0') {
            const order = await Order.findById(orderId);
            if (order) {
                for (let i = 0; i < order.items.length; i++) {
                    await Product.updateOne({ _id: order.items[i].product_id }, { $inc: { stock: -(order.items[i].quantity) } });
                }
                // Remove only ordered items from the user's cart
                const orderedIds = order.items.map(i => i.product_id);
                await User.updateOne({ _id: order.customer_id }, { $pull: { cart: { product_id: { $in: orderedIds } } } });
                await Order.updateOne({ _id: orderId }, { $set: { 'items.$[].status': 'confirmed', status: 'confirmed' } });

                let couponId = order.coupon && order.coupon.coupon_id ? order.coupon.coupon_id : null;
                if (couponId) {
                    await Coupen.findByIdAndUpdate(
                        { _id: couponId },
                        { $inc: { used_count: 1 }, $push: { user_list: order.customer_id } },
                        { new: true }
                    );
                }

                await Payment.updateOne(
                    { order_id: order._id },
                    { $set: { status: 'paid', amount: parseInt(amount || 0), payment_id: transId || orderId } }
                );
            }
            return res.json({ message: 'ok' });
        }

        await Payment.updateOne({ order_id: orderId }, { $set: { status: 'failed' } });
        return res.json({ message: 'failed' });
    } catch (e) {
        return res.status(500).json({ message: 'error' });
    }
};

//render sucecess page 
const order_success = async (req, res) => {
    let user_id = new mongoose.Types.ObjectId(res.locals.userData._id);
    let order = await Order.aggregate([
        {
            $match: {
                customer_id: user_id
            }
        },
        {
            $sort: {
                createdAt: -1
            }
        },
        {
            $limit: 1
        }
    ]);
    let order_id = order[0]._id;
    res.render('user/orderSuccess', { order: order_id, user: true, footer: true });
}

//prevent going back to checkout page
const verify_order = (req, res, next) => {
    let order = req.session.order;
    if (order) {
        res.redirect('/');
    } else {
        next();
    }
}

module.exports = {
    add_product_to_cart,
    render_cart_page,
    remove_product_from_cart,
    incrementQuantity,
    minus_cart_quantity,
    render_checkout,
    place_order,
    verify_order,
    order_success,
    verifyPaymenet,
    momoReturn,
    momoIpn
}
