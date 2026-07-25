const registerSchema = {
  type: 'object',
  required: ['name', 'email', 'phone', 'password'],
  properties: {
    name: { type: 'string', minLength: 2, maxLength: 100 },
    email: { type: 'string', format: 'email', maxLength: 100 },
    phone: { 
      type: 'string', 
      pattern: '^(0[3|5|7|8|9])([0-9]{8})$', // Viet Nam mobile format
      maxLength: 15 
    },
    // Mật khẩu yêu cầu ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số
    password: { 
      type: 'string', 
      minLength: 8, 
      maxLength: 50,
      pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).+$'
    }
    // [C3 FIX] Đã xóa trường 'role' — client không được phép tự chọn role
    // Role luôn được gán là 'customer' trong AuthController.register
  },
  additionalProperties: false
};

const loginSchema = {
  type: 'object',
  required: ['email', 'password'],
  properties: {
    email: { type: 'string', minLength: 3, maxLength: 150 },
    password: { type: 'string', minLength: 6 }
  },
  additionalProperties: false
};

module.exports = {
  registerSchema,
  loginSchema
};
