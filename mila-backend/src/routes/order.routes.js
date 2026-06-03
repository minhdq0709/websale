const express = require('express');
const router = express.Router();
const OrderController = require('../controllers/order.controller');
const auth = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { createOrderSchema } = require('../schemas/order.schema');

const { orderLimiter } = require('../middleware/rateLimiter.middleware');

// Tat ca cac route lien quan toi don hang deu bat buoc phai dang nhap
router.use(auth);

// Yêu cầu gửi mã OTP để thanh toán (Áp dụng rate limit chống spam)
router.post('/request-otp', orderLimiter, OrderController.requestOTP);

// Lấy thông tin tài khoản ngân hàng bảo mật (đã mã hóa) - Không áp dụng rate limit giao dịch nghiêm ngặt
router.get('/payment-info', OrderController.getPaymentInfo);

// Dat hang (Lay hang tu gio hang de tao don hang - Áp dụng rate limit và xác thực OTP)
router.post('/', orderLimiter, validate(createOrderSchema), OrderController.createOrder);

// Lay lich su mua hang cua ca nhan
router.get('/my', OrderController.getMyOrders);


// Lay chi tiet don hang (Co check so huu don hang trong controller)
router.get('/:id', OrderController.getOrderById);

// Huy don hang (Chi cho phep neu don hang o trang thai pending/processing)
router.patch('/:id/cancel', OrderController.cancelOrder);

module.exports = router;
