const bcrypt = require('bcrypt');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function seedData() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Dữ liệu Tài khoản Chủ shop
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash('password123', saltRounds);

    const userQuery = `
      INSERT INTO users (name, email, password_hash, role, status, phone, address)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (email) DO UPDATE SET password_hash = $3
      RETURNING id
    `;
    const userResult = await client.query(userQuery, [
      'Nguyễn Văn A',
      'contact@caulongstore.com',
      passwordHash,
      'vendor',
      'active',
      '0987654321',
      '123 Lê Lợi, TP. Vinh, Nghệ An'
    ]);
    const userId = userResult.rows[0].id;
    console.log(`[seed] User created with ID: ${userId}`);

    // 2. Dữ liệu Thông tin Cửa hàng
    const vendorQuery = `
      INSERT INTO vendors (user_id, store_name, slug, status, commission_rate, bank_info)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (user_id) DO UPDATE SET store_name = $2
      RETURNING id
    `;
    const vendorResult = await client.query(vendorQuery, [
      userId,
      'Thế Giới Cầu Lông',
      'the-gioi-cau-long',
      'active',
      5.00,
      JSON.stringify({ bank: 'Vietcombank', account_no: '1012345678', owner: 'NGUYEN VAN A' })
    ]);
    const vendorId = vendorResult.rows[0].id;
    console.log(`[seed] Vendor created with ID: ${vendorId}`);

    // 3. Bảng Danh mục
    // Xoá danh mục cũ nếu cần, hoặc insert on conflict do nothing.
    // Ở đây ta xoá toàn bộ để re-seed cho sạch
    await client.query('DELETE FROM categories');

    const catParentQuery = `
      INSERT INTO categories (name, slug, parent_id)
      VALUES ($1, $2, NULL)
      RETURNING id, slug
    `;
    const catParents = {};
    for (const cat of [
      { name: 'Vợt cầu lông', slug: 'vot-cau-long' },
      { name: 'Giày cầu lông', slug: 'giay-cau-long' },
      { name: 'Phụ kiện', slug: 'phu-kien-cau-long' }
    ]) {
      const res = await client.query(catParentQuery, [cat.name, cat.slug]);
      catParents[res.rows[0].slug] = res.rows[0].id;
    }

    const catChildQuery = `
      INSERT INTO categories (name, slug, parent_id)
      VALUES ($1, $2, $3)
      RETURNING id, name
    `;
    const catChildren = {};
    for (const cat of [
      { name: 'Vợt Yonex', slug: 'vot-yonex', parentSlug: 'vot-cau-long' },
      { name: 'Vợt Lining', slug: 'vot-lining', parentSlug: 'vot-cau-long' },
      { name: 'Vợt Victor', slug: 'vot-victor', parentSlug: 'vot-cau-long' },
      { name: 'Cước & Phụ kiện', slug: 'cuoc-phu-kien', parentSlug: 'phu-kien-cau-long' }
    ]) {
      const parentId = catParents[cat.parentSlug];
      const res = await client.query(catChildQuery, [cat.name, cat.slug, parentId]);
      catChildren[res.rows[0].name] = res.rows[0].id;
    }
    
    // Ánh xạ danh mục chính từ bảng vào id tương ứng
    // Bảng ở Insert.md có 3 cột cuối là giá, tồn kho, danh mục
    // Chúng ta sẽ map tên danh mục về ID của category.
    const mapCategory = (name) => {
      if (catChildren[name]) return catChildren[name];
      if (name === 'Giày') return catParents['giay-cau-long'];
      if (name === 'Phụ kiện') return catParents['phu-kien-cau-long'];
      return catParents['vot-cau-long']; // default fallback
    };

    // 4. Dữ liệu Sản phẩm
    const productsData = [
      { name: 'Yonex Astrox 88D Pro (Gen 3)', desc: 'Trọng lượng: 4U, Cán: G5. Điểm cân bằng: Nặng đầu. Sức căng: 28lbs. Công nghệ: Rotational Generator System.', price: 4250000, stock: 25, cat: 'Vợt Yonex' },
      { name: 'Yonex Nanoflare 1000Z', desc: 'Trọng lượng: 4U, Cán: G5. Dòng vợt siêu tốc độ, thân cứng, đầu cân bằng. Phù hợp đánh đôi, phản tạt.', price: 4100000, stock: 15, cat: 'Vợt Yonex' },
      { name: 'Lining Axforce 80', desc: 'Trọng lượng: 3U/4U. Thân vợt linh hoạt, thiên công mạnh mẽ. Sức căng tối đa: 30lbs.', price: 3850000, stock: 12, cat: 'Vợt Lining' },
      { name: 'Lining Halbertec 8000', desc: 'Trọng lượng: 4U, Cán: G5. Dòng vợt kiểm soát cầu toàn diện, cân bằng giữa công và thủ.', price: 3700000, stock: 20, cat: 'Vợt Lining' },
      { name: 'Victor Thruster Ryuga II', desc: 'Trọng lượng: 3U/4U. Vợt thiên công, thân cứng vừa phải, sức căng cực cao lên đến 31lbs.', price: 3600000, stock: 10, cat: 'Vợt Victor' },
      { name: 'Victor Brave Sword 12 SE', desc: 'Trọng lượng: 3U/4U. Khung vợt kim cương xé gió, huyền thoại của Victor cho lối đánh tốc độ.', price: 3100000, stock: 30, cat: 'Vợt Victor' },
      { name: 'Yonex Arcsaber 11 Pro', desc: 'Trọng lượng: 4U, Cán: G5. Vợt công thủ toàn diện, điều cầu cực kỳ chính xác.', price: 4050000, stock: 18, cat: 'Vợt Yonex' },
      { name: 'Giày Yonex 65Z3 Wide', desc: 'Giày chuyên dụng cầu lông cao cấp. Đệm Power Cushion+. Màu: Trắng/Xanh. Size: 39-44.', price: 2800000, stock: 45, cat: 'Giày' },
      { name: 'Cước Yonex BG66 Ultimax', desc: 'Đường kính: 0.65mm. Cước cho độ nảy cao, tiếng nổ đanh. Màu: Trắng, Vàng, Cam.', price: 180000, stock: 200, cat: 'Phụ kiện' },
      { name: 'Quấn cán Yonex AC102EX', desc: 'Chất liệu cao su non bám tay, thấm hút mồ hôi tốt. Vỉ 3 cái.', price: 120000, stock: 500, cat: 'Phụ kiện' }
    ];

    const productQuery = `
      INSERT INTO products (vendor_id, category_id, name, description, price, stock, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'active')
      RETURNING id
    `;

    for (const p of productsData) {
      const catId = mapCategory(p.cat);
      await client.query(productQuery, [vendorId, catId, p.name, p.desc, p.price, p.stock]);
    }
    console.log(`[seed] Inserted 10 products successfully`);

    await client.query('COMMIT');
    console.log(`[seed] Seeding completed successfully!`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`[seed] Seeding failed:`, err);
  } finally {
    client.release();
    process.exit(0);
  }
}

seedData();
