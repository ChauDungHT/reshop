import { Pool } from 'pg';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../../../.env') });

const connectionString = process.env.DATABASE_URL || 
  `postgres://${process.env.POSTGRES_USER || 'postgres'}:${process.env.POSTGRES_PASSWORD || 'password'}@localhost:5433/${process.env.POSTGRES_DB || 'cdshop'}`;

const pool = new Pool({
  connectionString,
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
