import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err: Error) => {
  console.error('[Error - database]: Unexpected error on idle client', err);
  process.exit(-1);
});

// Kiểm tra kết nối và log theo chuẩn .agent/log.md
pool.connect((err, client, release) => {
  if (err) {
    console.error(`[Error - database]: Connection Failed - ${err.message}`);
  } else {
    console.log(`[database]: Connected to PostgreSQL at ${process.env.DATABASE_URL?.split('@')[1] || 'default host'}`);
    release();
  }
});

export default {
  query: (text: string, params?: any[]) => pool.query(text, params),
  pool,
};
