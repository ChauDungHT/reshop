const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || 
  `postgres://${process.env.POSTGRES_USER || 'postgres'}:${process.env.POSTGRES_PASSWORD || 'password'}@localhost:5433/${process.env.POSTGRES_DB || 'cdshop'}`;

const pool = new Pool({ connectionString });

async function check() {
  // Check sub_orders table exists
  const t = await pool.query(
    "SELECT table_name FROM information_schema.tables WHERE table_name = 'sub_orders' AND table_schema = 'public'"
  );
  console.log('sub_orders table exists:', t.rows.length > 0);

  // Check order_items columns
  const c = await pool.query(
    "SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = 'order_items' AND table_schema = 'public' ORDER BY ordinal_position"
  );
  console.log('order_items columns:');
  c.rows.forEach(r => console.log(' ', r.column_name, '| nullable:', r.is_nullable));

  // Check orders columns
  const o = await pool.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name = 'orders' AND table_schema = 'public' ORDER BY ordinal_position"
  );
  console.log('orders columns:', o.rows.map(r => r.column_name).join(', '));

  // Count sub_orders created
  const s = await pool.query('SELECT COUNT(*) AS cnt FROM sub_orders');
  console.log('sub_orders count:', s.rows[0].cnt);

  // Check orphans
  const orphans = await pool.query('SELECT COUNT(*) AS cnt FROM order_items WHERE sub_order_id IS NULL');
  console.log('unlinked order_items (orphans):', orphans.rows[0].cnt);

  // Sample sub_orders
  const sample = await pool.query('SELECT sub_order_code, status, subtotal, vendor_id FROM sub_orders LIMIT 5');
  console.log('Sample sub_orders:');
  sample.rows.forEach(r => console.log(' ', JSON.stringify(r)));

  pool.end();
}

check().catch(e => { console.error(e.message); pool.end(); });
