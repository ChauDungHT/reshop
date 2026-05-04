const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function drop() {
  try {
    await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
    console.log('[database]: Schema reset successfully.');
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

drop();
