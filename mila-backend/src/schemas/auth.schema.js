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
    password: { type: 'string', minLength: 6, maxLength: 50 },
    role: { type: 'string', enum: ['customer', 'staff', 'admin'], default: 'customer' }
  },
  additionalProperties: false
};

const loginSchema = {
  type: 'object',
  required: ['email', 'password'],
  properties: {
    email: { type: 'string', format: 'email' },
    password: { type: 'string', minLength: 6 }
  },
  additionalProperties: false
};

module.exports = {
  registerSchema,
  loginSchema
};
