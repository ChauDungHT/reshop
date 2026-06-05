const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const connectionString = process.env.DATABASE_URL || 
  `postgres://${process.env.POSTGRES_USER || 'postgres'}:${process.env.POSTGRES_PASSWORD || 'password'}@localhost:5433/${process.env.POSTGRES_DB || 'cdshop'}`;

const pool = new Pool({
  connectionString,
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
