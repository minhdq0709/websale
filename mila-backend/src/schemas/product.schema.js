const createProductSchema = {
  type: 'object',
  required: ['name', 'category_id', 'price', 'unit'],
  properties: {
    name: { type: 'string', minLength: 2, maxLength: 200 },
    category_id: { type: 'integer', minimum: 1 },
    price: { type: 'number', minimum: 0 },
    sale_price: { type: ['number', 'null'], minimum: 0, default: null },
    unit: { type: 'string', minLength: 1, maxLength: 50 },
    stock: { type: 'integer', minimum: 0, default: 0 },
    description: { type: 'string', maxLength: 1000, default: '' },
    images: { 
      type: 'array', 
      items: { type: 'string' },
      default: [] 
    },
    is_active: { type: 'boolean', default: true }
  },
  additionalProperties: false
};

const updateProductSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 2, maxLength: 200 },
    category_id: { type: 'integer', minimum: 1 },
    price: { type: 'number', minimum: 0 },
    sale_price: { type: ['number', 'null'], minimum: 0 },
    unit: { type: 'string', minLength: 1, maxLength: 50 },
    stock: { type: 'integer', minimum: 0 },
    description: { type: 'string', maxLength: 1000 },
    images: { 
      type: 'array', 
      items: { type: 'string' }
    },
    is_active: { type: 'boolean' }
  },
  additionalProperties: false
};

const createCategorySchema = {
  type: 'object',
  required: ['name'],
  properties: {
    name: { type: 'string', minLength: 2, maxLength: 100 },
    parent_id: { type: ['integer', 'null'], minimum: 1, default: null }
  },
  additionalProperties: false
};

module.exports = {
  createProductSchema,
  updateProductSchema,
  createCategorySchema
};
