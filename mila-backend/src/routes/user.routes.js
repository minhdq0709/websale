const express = require('express');
const router = express.Router();
const UserController = require('../controllers/user.controller');
const auth = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { updateProfileSchema, changePasswordSchema } = require('../schemas/user.schema');

// Bat buoc dang nhap
router.use(auth);

// Lay thong tin tai khoan
router.get('/profile', UserController.getProfile);

// Cap nhat ho so (Ten, so dien thoai) — [M5 FIX] Thêm validate middleware
router.put('/profile', validate(updateProfileSchema), UserController.updateProfile);

// Doi mat khau tai khoan (Co verify password cu) — [M5 FIX] Thêm validate middleware
router.put('/password', validate(changePasswordSchema), UserController.changePassword);

module.exports = router;
