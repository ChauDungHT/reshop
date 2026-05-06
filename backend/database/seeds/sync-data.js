const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function parseMarkdownTable(content, sectionTitle) {
  const lines = content.split('\n');
  let tableStarted = false;
  const tableLines = [];
  
  let sectionFound = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.includes(sectionTitle)) {
      sectionFound = true;
      continue;
    }
    
    if (sectionFound && line.startsWith('|')) {
      if (line.includes('---')) {
        tableStarted = true;
        continue;
      }
      if (tableStarted) {
        tableLines.push(line);
      } else if (line.toLowerCase().includes('id') || line.toLowerCase().includes('stt')) {
        // Skip header
        continue;
      } else {
        // Likely first row if no divider yet, but let's wait for divider
      }
    } else if (sectionFound && tableStarted && line === '') {
      break;
    }
  }

  return tableLines.map(line => {
    return line.split('|').filter(c => c.trim() !== '').map(c => c.trim());
  });
}

async function parseShopInfo(content) {
  const shopInfo = {};
  const userLines = content.match(/[#]{2,3} 1\. Dữ liệu Tài khoản Chủ shop[\s\S]*?(?=[#]{2,3} 2|$)/)?.[0] || '';
  const vendorLines = content.match(/[#]{2,3} 2\. Dữ liệu Thông tin Cửa hàng[\s\S]*?(?=[#]{2,3} 3|$)/)?.[0] || '';

  const extract = (text, key) => {
    const match = text.match(new RegExp(`\\* \\*\\*${key}\\*\\*: (.*)`));
    return match ? match[1].replace(/[*_`]/g, '').trim() : null;
  };

  shopInfo.user = {
    name: extract(userLines, 'name'),
    email: extract(userLines, 'email'),
    phone: extract(userLines, 'phone'),
    address: extract(userLines, 'address'),
  };

  shopInfo.vendor = {
    store_name: extract(vendorLines, 'store_name'),
    slug: extract(vendorLines, 'slug'),
    commission_rate: parseFloat(extract(vendorLines, 'commission_rate')) || 5.0,
    bank_info: vendorLines.match(/Ví dụ JSON\*: `(.*)`/)?.[1] || '{}',
  };

  return shopInfo;
}

async function syncData() {
  const promptPath = path.join(__dirname, '../../../prompt/insert.md');
  if (!fs.existsSync(promptPath)) {
    console.error(`Prompt file not found at ${promptPath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(promptPath, 'utf8');
  const shopInfo = await parseShopInfo(content);
  const categoriesTable = await parseMarkdownTable(content, 'Bảng Danh mục');
  const productsTable = await parseMarkdownTable(content, 'Dữ liệu Sản phẩm');

  console.log(`[sync] Parsed Shop: ${shopInfo.vendor.store_name}`);
  console.log(`[sync] Parsed Categories: ${categoriesTable.length}`);
  console.log(`[sync] Parsed Products: ${productsTable.length}`);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Sync User
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash('password123', saltRounds);
    const userQuery = `
      INSERT INTO users (name, email, password_hash, role, status, phone, address)
      VALUES ($1, $2, $3, 'vendor', 'active', $4, $5)
      ON CONFLICT (email) DO UPDATE SET name = $1, phone = $4, address = $5
      RETURNING id
    `;
    const userResult = await client.query(userQuery, [
      shopInfo.user.name,
      shopInfo.user.email,
      passwordHash,
      shopInfo.user.phone,
      shopInfo.user.address
    ]);
    const userId = userResult.rows[0].id;

    // 2. Sync Vendor
    const vendorQuery = `
      INSERT INTO vendors (user_id, store_name, slug, status, commission_rate, bank_info)
      VALUES ($1, $2, $3, 'active', $4, $5)
      ON CONFLICT (user_id) DO UPDATE SET store_name = $2, slug = $3, commission_rate = $4, bank_info = $5
      RETURNING id
    `;
    const vendorResult = await client.query(vendorQuery, [
      userId,
      shopInfo.vendor.store_name,
      shopInfo.vendor.slug,
      shopInfo.vendor.commission_rate,
      shopInfo.vendor.bank_info
    ]);
    const vendorId = vendorResult.rows[0].id;

    // 3. Clear existing data to avoid conflicts
    await client.query('DELETE FROM products');
    await client.query('DELETE FROM categories');

    // 4. Sync Categories
    const catMap = {};
    const parentCats = categoriesTable.filter(c => c[3].toLowerCase() === 'null');
    const childCats = categoriesTable.filter(c => c[3].toLowerCase() !== 'null');

    for (const row of parentCats) {
      const res = await client.query(
        'INSERT INTO categories (name, slug, parent_id) VALUES ($1, $2, NULL) RETURNING id',
        [row[1], row[2]]
      );
      catMap[row[0]] = res.rows[0].id;
    }

    for (const row of childCats) {
      const parentId = catMap[row[3]];
      const res = await client.query(
        'INSERT INTO categories (name, slug, parent_id) VALUES ($1, $2, $3) RETURNING id',
        [row[1], row[2], parentId]
      );
      catMap[row[0]] = res.rows[0].id;
    }

    // 5. Sync Products
    const productQuery = `
      INSERT INTO products (vendor_id, category_id, name, description, price, stock, image_urls, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
    `;

    // Map category name to ID
    const catNameToId = {};
    const allCats = await client.query('SELECT id, name FROM categories');
    allCats.rows.forEach(c => catNameToId[c.name] = c.id);

    // Hardcoded image mapping based on current files
    const imageMap = {
      'Yonex Astrox 88D Pro (Gen 3)': ['/uploads/products/astrox-88d.png'],
      'Yonex Nanoflare 1000Z': ['/uploads/products/nanoflare-1000z.png'],
      'Lining Axforce 80': ['/uploads/products/axforce-80.png'],
      'Lining Halbertec 8000': ['/uploads/products/halbertec-8000.png'],
      'Victor Thruster Ryuga II': ['/uploads/products/ryuga-ii.png'],
      'Victor Brave Sword 12 SE': ['/uploads/products/brave-sword-12.png'],
      'Yonex Arcsaber 11 Pro': ['/uploads/products/arcsaber-11-pro.png'],
      'Giày Yonex 65Z3 Wide': ['/uploads/products/yonex-65z3.png'],
      'Cước Yonex BG66 Ultimax': ['/uploads/products/bg66-ultimax.png'],
      'Quấn cá Yonex AC102EX': ['/uploads/products/ac102ex-grip.png'],
      'Quấn cán Yonex AC102EX': ['/uploads/products/ac102ex-grip.png']
    };

    for (const row of productsTable) {
      const name = row[1].replace(/\*\*/g, '').trim();
      const desc = row[2];
      const price = parseFloat(row[3].replace(/,/g, ''));
      const stock = parseInt(row[4]);
      const catName = row[5];
      const catId = catNameToId[catName] || catNameToId['Vợt cầu lông']; // fallback
      
      const images = imageMap[name] || [];

      await client.query(productQuery, [
        vendorId,
        catId,
        name,
        desc,
        price,
        stock,
        JSON.stringify(images)
      ]);
    }

    await client.query('COMMIT');
    console.log(`[sync] Successfully synchronized data from ${promptPath}`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`[sync] Failed to sync data:`, err);
  } finally {
    client.release();
    process.exit(0);
  }
}

syncData();
