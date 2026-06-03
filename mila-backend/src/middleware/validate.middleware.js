const Ajv = require('ajv');
const addFormats = require('ajv-formats');

// Khoi tao AJV
const ajv = new Ajv({ 
  allErrors: true,    // Hien thi tat ca loi chu khong dung o loi dau tien
  coerceTypes: true,  // Tu dong chuyen doi kieu (VD: string '12' thanh number 12 khi can)
  useDefaults: true,  // Ap dung gia tri default duoc khai bao trong schema
  removeAdditional: 'all', // Xoa cac truong ngoai le khong khai bao trong schema (tranh mass assignment)
});

addFormats(ajv);

/**
 * Middleware xac thuc du lieu dau vao su dung AJV Schema
 * @param {object} schema - Schema AJV dung de kiem tra
 * @param {'body' | 'query' | 'params'} source - Nguon du lieu can check (body, query hoac params)
 */
const validateMiddleware = (schema, source = 'body') => {
  const validate = ajv.compile(schema);
  
  return (req, res, next) => {
    const data = req[source];
    const valid = validate(data);
    
    if (!valid) {
      const errors = validate.errors.map(err => {
        // Lay ten field bi loi
        let field = err.instancePath.substring(1); // Bo dau '/' o dau
        if (!field && err.params && err.params.missingProperty) {
          field = err.params.missingProperty;
        }
        
        return {
          field: field || 'general',
          message: translateAJVError(field, err)
        };
      });

      console.error('AJV Validation Error Details:', JSON.stringify(errors, null, 2));
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu đầu vào không hợp lệ. Vui lòng kiểm tra lại.',
        code: 'VALIDATION_ERROR',
        errors
      });
    }
    
    // Vi AJV co the da update data (coerceTypes va useDefaults), gan nguoc lai de cac middleware khac su dung
    req[source] = data;
    next();
  };
};

/**
 * Helper dich thong bao loi cua AJV sang tieng Viet de phan hoi phia Client than thien hon
 */
function translateAJVError(field, error) {
  const fieldName = field ? `Trường '${field}'` : 'Dữ liệu';
  switch (error.keyword) {
    case 'required':
      return `${fieldName} là bắt buộc, không được để trống.`;
    case 'type':
      return `${fieldName} phải có kiểu dữ liệu là ${error.params.type}.`;
    case 'format':
      if (error.params.format === 'email') return `${fieldName} phải là một địa chỉ email hợp lệ.`;
      if (error.params.format === 'phone') return `${fieldName} phải là số điện thoại hợp lệ.`;
      return `${fieldName} sai định dạng (${error.params.format}).`;
    case 'minLength':
      return `${fieldName} phải có độ dài tối thiểu là ${error.params.limit} ký tự.`;
    case 'maxLength':
      return `${fieldName} chỉ được phép tối đa ${error.params.limit} ký tự.`;
    case 'minimum':
      return `${fieldName} phải lớn hơn hoặc bằng ${error.params.limit}.`;
    case 'maximum':
      return `${fieldName} phải nhỏ hơn hoặc bằng ${error.params.limit}.`;
    case 'pattern':
      return `${fieldName} không đúng định dạng yêu cầu.`;
    default:
      return error.message || 'Không hợp lệ.';
  }
}

module.exports = validateMiddleware;
