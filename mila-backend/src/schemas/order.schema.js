const createOrderSchema = {
  type: 'object',
  required: ['shipping_address'],
  properties: {
    shipping_address: {
      type: 'object',
      required: ['name', 'phone', 'street', 'ward', 'district', 'province'],
      properties: {
        name: { type: 'string', minLength: 2, maxLength: 100 },
        phone: { 
          type: 'string', 
          pattern: '^(0[3|5|7|8|9])([0-9]{8})$',
          maxLength: 15 
        },
        street: { type: 'string', minLength: 2, maxLength: 200 },
        ward: { type: 'string', minLength: 2, maxLength: 100 },
        district: { type: 'string', minLength: 2, maxLength: 100 },
        province: { type: 'string', minLength: 2, maxLength: 100 }
      },
      additionalProperties: false
    },
    note: { type: 'string', maxLength: 500, default: '' }
  },
  additionalProperties: false
};

const updateOrderStatusSchema = {
  type: 'object',
  required: ['status'],
  properties: {
    status: { 
      type: 'string', 
      enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'] 
    }
  },
  additionalProperties: false
};

module.exports = {
  createOrderSchema,
  updateOrderStatusSchema
};
