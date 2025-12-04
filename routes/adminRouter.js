const express = require('express');
const { createAdmin, doLogin, } = require('../controller/authcontrller');
const { isAdminloggedIn } = require('../middlewares/authMiddleware');
const router = express.Router();
const { render_dharboard,
    getGraphDetails,
    render_login, redirect_dash,
    render_forget_pass,
    send_otp,
    veryfy_otp,
    render_rest_pass,
    update_password,
    get_orders,
    render_change_order_status,
    update_order_status,
    get_invoice } = require('../controller/admincontroller')

// News admin
const newsController = require('../controller/newsController');
const { uploadNews } = require('../middlewares/upload');


//admin loign and forget password section

router.post('/create_admin', createAdmin)

router.get('/', isAdminloggedIn, redirect_dash);

router.get('/get-sales', isAdminloggedIn, getGraphDetails);

router.get('/login', render_login)

router.post('/login', doLogin);

router.get('/dash', isAdminloggedIn, render_dharboard)

router.get('/forget-pass', render_forget_pass)

router.post('/forget-pass', send_otp)

router.post('/verify-otp', veryfy_otp)

router.get('/reset-pass', render_rest_pass)

router.post('/upadte-pass', update_password)

router.get('/orders', isAdminloggedIn, get_orders);

router.get('/orders/view-invoice', isAdminloggedIn, get_invoice);

router.get('/manage-order', isAdminloggedIn, render_change_order_status);

router.post('/changeStatus/:id', isAdminloggedIn, update_order_status)

router.get('/logout', (req, res) => {
    res.clearCookie('adminTocken');
    res.redirect('/admin/login')
})

// News CRUD
router.get('/news', isAdminloggedIn, newsController.adminList);
router.get('/news/new', isAdminloggedIn, newsController.newForm);
router.post('/news', isAdminloggedIn, uploadNews.single('coverImage'), newsController.create);
router.get('/news/:id/edit', isAdminloggedIn, newsController.editForm);
router.post('/news/:id', isAdminloggedIn, uploadNews.single('coverImage'), newsController.update);
router.post('/news/:id/delete', isAdminloggedIn, newsController.remove);

module.exports = router
