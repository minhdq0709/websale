const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const productRoutes = require('./product.routes');
const cartRoutes = require('./cart.routes');
const orderRoutes = require('./order.routes');
const userRoutes = require('./user.routes');
const adminRoutes = require('./admin.routes');

// Mount cac router con vao cac prefix thich hop
router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', orderRoutes);
router.use('/users', userRoutes);
router.use('/admin', adminRoutes);

// Export router tong hop
module.exports = router;
