/**
 * [M5 FIX] Schema validation cho User routes
 * Áp dụng cho: updateProfile, changePassword
 */

const updateProfileSchema = {
  type: 'object',
  required: ['name', 'phone'],
  properties: {
    name: { type: 'string', minLength: 2, maxLength: 100 },
    phone: {
      type: 'string',
      pattern: '^(0[3|5|7|8|9])([0-9]{8})$',
      maxLength: 15
    }
  },
  additionalProperties: false
};

const changePasswordSchema = {
  type: 'object',
  required: ['oldPassword', 'newPassword'],
  properties: {
    oldPassword: { type: 'string', minLength: 1, maxLength: 100 },
    // Mật khẩu mới yêu cầu ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số
    newPassword: {
      type: 'string',
      minLength: 8,
      maxLength: 50,
      pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).+$'
    }
  },
  additionalProperties: false
};

module.exports = {
  updateProfileSchema,
  changePasswordSchema
};
