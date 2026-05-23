const addItemSchema = {
  type: 'object',
  required: ['product_id', 'quantity'],
  properties: {
    product_id: { type: 'integer', minimum: 1 },
    quantity: { type: 'integer', minimum: 1 }
  },
  additionalProperties: false
};

const updateItemSchema = {
  type: 'object',
  required: ['quantity'],
  properties: {
    quantity: { type: 'integer', minimum: 1 }
  },
  additionalProperties: false
};

module.exports = {
  addItemSchema,
  updateItemSchema
};
