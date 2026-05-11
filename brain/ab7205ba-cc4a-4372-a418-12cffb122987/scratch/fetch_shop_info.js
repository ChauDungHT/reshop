const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgres://postgres:password@localhost:5433/cdshop'
});

async function getShopInfo() {
  try {
    const email = 'contact@caulongstore.com';
    const query = `
      SELECT u.name, u.email, u.phone, u.address, 
             v.store_name, v.slug, v.commission_rate, v.bank_info
      FROM users u
      LEFT JOIN vendors v ON u.id = v.user_id
      WHERE u.email = $1
    `;
    const res = await pool.query(query, [email]);
    
    if (res.rows.length > 0) {
      console.log(JSON.stringify(res.rows[0], null, 2));
    } else {
      console.log('No user found with email: ' + email);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

getShopInfo();
