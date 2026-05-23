const express = require('express');
const router = express.Router();
const ProductController = require('../controllers/product.controller');

// Lay tat ca danh muc san pham
router.get('/categories', ProductController.getAllCategories);

// Lay san pham noi bat (featured)
router.get('/featured', ProductController.getFeaturedProducts);

// Lay danh sach tat ca san pham (ho tro search, category, pricing filter, sorting, pagination)
router.get('/', ProductController.getAllProducts);

// Lay chi tiet 1 san pham theo ID
router.get('/:id', ProductController.getProductById);

module.exports = router;
