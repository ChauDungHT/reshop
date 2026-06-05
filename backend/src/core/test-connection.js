const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || 
  `postgres://${process.env.POSTGRES_USER || 'postgres'}:${process.env.POSTGRES_PASSWORD || 'password'}@localhost:5433/${process.env.POSTGRES_DB || 'cdshop'}`;

const pool = new Pool({
  connectionString,
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