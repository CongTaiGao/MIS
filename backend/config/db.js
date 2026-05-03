const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: 'mytour-mysql.cj8yk8ai2pog.ap-southeast-1.rds.amazonaws.com',
  port: 3306,
  user: 'admin',
  password: 'tour123*',
  database: 'mytour_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

pool.getConnection()
  .then(conn => {
    console.log('✅ MySQL connected successfully');
    conn.release();
  })
  .catch(err => {
    console.error('❌ MySQL connection error:', err.message);
  });

module.exports = pool;
