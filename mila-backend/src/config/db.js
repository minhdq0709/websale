const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host:               process.env.DB_HOST || 'localhost',
  port:               parseInt(process.env.DB_PORT) || 3306,
  user:               process.env.DB_USER || 'root',
  password:           process.env.DB_PASS || '',
  database:           process.env.DB_NAME || 'mila_market',
  waitForConnections: true,
  connectionLimit:    10,
  charset:            'utf8mb4',
  timezone:           '+07:00',
});

// Test connection khi khoi dong
pool.getConnection()
  .then(conn => { console.log('✅ MySQL connected'); conn.release(); })
  .catch(err => { console.error('❌ MySQL error:', err.message); });

module.exports = pool;
