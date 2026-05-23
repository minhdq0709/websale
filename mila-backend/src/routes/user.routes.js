const express = require('express');
const router = express.Router();
const UserController = require('../controllers/user.controller');
const auth = require('../middleware/auth.middleware');

// Bat buoc dang nhap
router.use(auth);

// Lay thong tin tai khoan
router.get('/profile', UserController.getProfile);

// Cap nhat ho so (Ten, so dien thoai)
router.put('/profile', UserController.updateProfile);

// Doi mat khau tai khoan (Co verify password cu)
router.put('/password', UserController.changePassword);

module.exports = router;
