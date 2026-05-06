const bcrypt = require('bcrypt');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function seedAdmin() {
  const args = process.argv.slice(2);
  let email = null;
  let password = null;

  args.forEach(arg => {
    if (arg.startsWith('--email=')) {
      email = arg.split('=')[1];
    }
    if (arg.startsWith('--password=')) {
      password = arg.split('=')[1];
    }
  });

  if (!email || !password) {
    console.error('Vui lòng cung cấp email và password: npm run seed:admin -- --email=... --password=...');
    process.exit(1);
  }

  try {
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const query = `
      INSERT INTO users (name, email, password_hash, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, email, role
    `;
    const values = ['Admin User', email, passwordHash, 'admin'];

    const res = await pool.query(query, values);
    console.log('Tạo tài khoản Admin thành công:', res.rows[0]);
  } catch (err) {
    if (err.code === '23505') { // unique violation
      console.error(`Email ${email} đã tồn tại trong hệ thống.`);
    } else {
      console.error('Lỗi khi tạo admin:', err);
    }
  } finally {
    pool.end();
  }
}

seedAdmin();
