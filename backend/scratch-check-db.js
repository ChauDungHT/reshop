const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function check() {
  try {
    const tableRes = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`);
    console.log("TABLES:", tableRes.rows.map(r => r.table_name).join(', '));

    const prodCols = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'products'`);
    console.log("PRODUCTS COLUMNS:", prodCols.rows.map(r => r.column_name).join(', '));
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

check();
