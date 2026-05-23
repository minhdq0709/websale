const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/auth.controller');
const validate = require('../middleware/validate.middleware');
const { registerSchema, loginSchema } = require('../schemas/auth.schema');
const { authLimiter } = require('../middleware/rateLimiter.middleware');
const auth = require('../middleware/auth.middleware');

// Route dang ky (co gioi han tan suat dang ky va validate dau vao)
router.post('/register', authLimiter, validate(registerSchema), AuthController.register);

// Route dang nhap (co gioi han tan suat dang nhap va validate dau vao)
router.post('/login', authLimiter, validate(loginSchema), AuthController.login);

// Route lam moi token
router.post('/refresh', AuthController.refresh);

// Route dang xuat (yeu cau phai dang nhap truoc do de thu hoi refresh token)
router.post('/logout', AuthController.logout);

module.exports = router;
