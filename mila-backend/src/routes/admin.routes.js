const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/admin.controller');
const auth = require('../middleware/auth.middleware');
const role = require('../middleware/role.middleware');
const validate = require('../middleware/validate.middleware');

const { createProductSchema, updateProductSchema, createCategorySchema } = require('../schemas/product.schema');
const { updateOrderStatusSchema } = require('../schemas/order.schema');

// Tat ca cac api admin deu yeu cau dang nhap
router.use(auth);

// ==========================================
// ROUTE DANH CHO CA ADMIN VA STAFF (QUAN TRI BAN HANG)
// ==========================================
const salesManagers = role(['admin', 'staff']);

// --- Quan ly san pham ---
router.post('/products', salesManagers, validate(createProductSchema), AdminController.createProduct);
router.put('/products/:id', salesManagers, validate(updateProductSchema), AdminController.updateProduct);
router.delete('/products/:id', salesManagers, AdminController.deleteProduct);

// --- Quan ly danh muc ---
router.post('/categories', salesManagers, validate(createCategorySchema), AdminController.createCategory);
router.put('/categories/:id', salesManagers, AdminController.updateCategory);
router.delete('/categories/:id', salesManagers, AdminController.deleteCategory);

// --- Quan ly don hang ---
router.get('/orders', salesManagers, AdminController.getAllOrders);
router.put('/orders/:id/status', salesManagers, validate(updateOrderStatusSchema), AdminController.updateOrderStatus);


// ==========================================
// ROUTE CHI DANH RIENG CHO ADMIN TOI CAO (QUAN LY HE THONG)
// ==========================================
const superAdmins = role(['admin']);

// --- Quan ly nguoi dung (Lock/Unlock, Doi quyen) ---
router.get('/users', superAdmins, AdminController.getAllUsers);
router.put('/users/:id/status', superAdmins, AdminController.updateUserStatus);

// --- Bao cao doanh thu & Thong ke ---
router.get('/reports', superAdmins, AdminController.getDashboardStats);

module.exports = router;
