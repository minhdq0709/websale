const express = require('express');
const router = express.Router();
const CartController = require('../controllers/cart.controller');
const auth = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { addItemSchema, updateItemSchema } = require('../schemas/cart.schema');

// Tat ca cac route trong gio hang deu yeu cau xac thuc dang nhap
router.use(auth);

// Lay thong tin gio hang hien tai
router.get('/', CartController.getCart);

// Them san pham vao gio
router.post('/items', validate(addItemSchema), CartController.addItem);

// Cap nhat so luong cua 1 item trong gio (truyen ID cua cart_items)
router.put('/items/:id', validate(updateItemSchema), CartController.updateItem);

// Xoa 1 item khoi gio hang
router.delete('/items/:id', CartController.removeItem);

// Don sach gio hang
router.delete('/', CartController.clearCart);

module.exports = router;
