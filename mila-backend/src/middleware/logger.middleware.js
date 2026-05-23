const winston = require('winston');
const path = require('path');

// Cau hinh Winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    // Ghi tat ca logs vao file combined.log
    new winston.transports.File({ 
      filename: path.join(__dirname, '../../logs/combined.log') 
    }),
    // Ghi rieng logs loi vao error.log
    new winston.transports.File({ 
      filename: path.join(__dirname, '../../logs/error.log'), 
      level: 'error' 
    })
  ]
});

// Neu khong phai production thi log ra console voi giao dien dep hon
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.printf(({ level, message, timestamp, stack }) => {
        if (stack) {
          // In ra ca error stack trace
          return `[${timestamp}] ${level}: ${message}\n${stack}`;
        }
        return `[${timestamp}] ${level}: ${message}`;
      })
    )
  }));
}

// Middleware de log chi tiet moi request den
const loggerMiddleware = (req, res, next) => {
  const start = Date.now();
  
  // Khi request hoan thanh (gui response xong)
  res.on('finish', () => {
    const duration = Date.now() - start;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const logMsg = `${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms) - IP: ${ip} - User-Agent: ${req.headers['user-agent']}`;
    
    if (res.statusCode >= 500) {
      logger.error(logMsg);
    } else if (res.statusCode >= 400) {
      logger.warn(logMsg);
    } else {
      logger.info(logMsg);
    }
  });

  next();
};

module.exports = {
  logger,
  loggerMiddleware
};
