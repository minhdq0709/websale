const express = require('express');
const router = express.Router();
const OrderController = require('../controllers/order.controller');
const auth = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { createOrderSchema } = require('../schemas/order.schema');

// Tat ca cac route lien quan toi don hang deu bat buoc phai dang nhap
router.use(auth);

// Dat hang (Lay hang tu gio hang de tao don hang)
router.post('/', validate(createOrderSchema), OrderController.createOrder);

// Lay lich su mua hang cua ca nhan
router.get('/my', OrderController.getMyOrders);

// Lay chi tiet don hang (Co check so huu don hang trong controller)
router.get('/:id', OrderController.getOrderById);

// Huy don hang (Chi cho phep neu don hang o trang thai pending/processing)
router.patch('/:id/cancel', OrderController.cancelOrder);

module.exports = router;
