require('dotenv').config();
const { Pool } = require('pg');

// Sử dụng connectionString thay vì các biến đơn lẻ
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function testConnection() {
  try {
    const res = await pool.query('SELECT NOW(), current_database(), current_user');
    console.log('✅ Kết nối thành công bằng DATABASE_URL!');
    console.log('--- Thông tin ---');
    console.log('Database:', res.rows[0].current_database);
    console.log('User:', res.rows[0].current_user);
    await pool.end();
  } catch (err) {
    console.error('❌ Kết nối thất bại!');
    console.error('Lý do:', err.message);
    process.exit(1);
  }
}

testConnection();