const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

const connectionString = process.env.DATABASE_URL || 
  `postgres://${process.env.POSTGRES_USER || 'postgres'}:${process.env.POSTGRES_PASSWORD || 'password'}@localhost:5433/${process.env.POSTGRES_DB || 'cdshop'}`;

const pool = new Pool({
  connectionString,
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
    // Xoá dữ liệu cũ để re-seed cho sạch
    await client.query('DELETE FROM products');
    await client.query('DELETE FROM categories');

    const categoriesToSeed = [
      // Level 1
      { id: '7c36020b-9a5d-4883-9730-0946b7c53740', name: 'Vợt cầu lông', slug: 'vot-cau-long', parent_id: null, sort_order: 0 },
      { id: '4e591a29-8377-4f0e-9f42-b54864edbfa7', name: 'Giày cầu lông', slug: 'giay-cau-long', parent_id: null, sort_order: 0 },
      { id: '0875fc36-3bcb-4a99-a31f-e7d4883e5b54', name: 'Phụ kiện', slug: 'phu-kien-cau-long', parent_id: null, sort_order: 0 },
      { id: 'da60b7cc-2642-43d5-9fe7-fc0180a2ff44', name: 'Quần áo thể thao', slug: 'quan-ao', parent_id: null, sort_order: 0 },
      { id: '7d1cb22e-7720-49e1-82da-17c0fc50ce00', name: 'Balo & Túi', slug: 'balo-tui', parent_id: null, sort_order: 0 },

      // Level 2 (Vợt)
      { id: '7f78d44c-2f11-4af4-bb37-a597a68ebead', name: 'Vợt Yonex', slug: 'vot-yonex', parent_id: '7c36020b-9a5d-4883-9730-0946b7c53740', sort_order: 1 },
      { id: '58529a82-fc87-4edb-924f-fc7e68d07a59', name: 'Vợt Victor', slug: 'vot-victor', parent_id: '7c36020b-9a5d-4883-9730-0946b7c53740', sort_order: 2 },
      { id: 'fbede5ad-f454-438b-957c-b2f8776b994d', name: 'Vợt Lining', slug: 'vot-lining', parent_id: '7c36020b-9a5d-4883-9730-0946b7c53740', sort_order: 3 },
      { id: 'dd732db0-8471-4525-abe0-ba3dcf1b3c73', name: 'Vợt Mizuno', slug: 'vot-mizuno', parent_id: '7c36020b-9a5d-4883-9730-0946b7c53740', sort_order: 4 },
      { id: '45f4034c-8a9d-410b-b32d-9c7b3d95af40', name: 'Vợt Kumpoo', slug: 'vot-kumpoo', parent_id: '7c36020b-9a5d-4883-9730-0946b7c53740', sort_order: 5 },

      // Level 2 (Giày)
      { id: '3788ef90-b3fd-4e68-94ca-b2f30c15a7dc', name: 'Giày nam', slug: 'giay-cau-long-nam', parent_id: '4e591a29-8377-4f0e-9f42-b54864edbfa7', sort_order: 1 },
      { id: '6db30711-aff3-4c6e-82b8-c73cae83acf2', name: 'Giày nữ', slug: 'giay-cau-long-nu', parent_id: '4e591a29-8377-4f0e-9f42-b54864edbfa7', sort_order: 2 },
      { id: 'e0cc86d4-4754-4868-ab43-75b230472686', name: 'Giày trẻ em', slug: 'giay-cau-long-tre-em', parent_id: '4e591a29-8377-4f0e-9f42-b54864edbfa7', sort_order: 3 },

      // Level 2 (Phụ kiện)
      { id: 'b6ccae8b-bf6f-4427-964a-44c032a07109', name: 'Cước & Dây', slug: 'cuoc-va-day', parent_id: '0875fc36-3bcb-4a99-a31f-e7d4883e5b54', sort_order: 1 },
      { id: '1359cf89-cd3c-4f28-9750-afbfcfd1e74d', name: 'Phụ kiện vợt', slug: 'phu-kien-vot', parent_id: '0875fc36-3bcb-4a99-a31f-e7d4883e5b54', sort_order: 2 },

      // Level 2 (Quần áo)
      { id: 'a9e73dbb-319e-436a-86d8-d682344279aa', name: 'Áo thi đấu', slug: 'ao-thi-dau', parent_id: 'da60b7cc-2642-43d5-9fe7-fc0180a2ff44', sort_order: 1 },
      { id: '30282f08-0d53-4fa7-a4b9-2f947e6910f8', name: 'Quần thi đấu', slug: 'quan-thi-dau', parent_id: 'da60b7cc-2642-43d5-9fe7-fc0180a2ff44', sort_order: 2 },

      // Level 2 (Balo)
      { id: 'ac2882a5-f170-4376-8c5d-1a09993b8e23', name: 'Balo đựng vợt', slug: 'balo-dung-vot', parent_id: '7d1cb22e-7720-49e1-82da-17c0fc50ce00', sort_order: 1 },
      { id: '58ac2f24-b7c6-4cd6-a7f3-e014e4d06b1b', name: 'Túi vợt đơn', slug: 'tui-vot-don', parent_id: '7d1cb22e-7720-49e1-82da-17c0fc50ce00', sort_order: 2 },
      { id: '42b7b369-8eb9-45ba-9bbf-67aeadff0eed', name: 'Túi vợt đôi', slug: 'tui-vot-doi', parent_id: '7d1cb22e-7720-49e1-82da-17c0fc50ce00', sort_order: 3 },

      // Level 3 (Yonex)
      { id: '6a065b10-d119-4d74-b392-2db492d062ad', name: 'Yonex Astrox', slug: 'yonex-astrox', parent_id: '7f78d44c-2f11-4af4-bb37-a597a68ebead', sort_order: 1 },
      { id: 'e60bdcd5-580a-4ad9-bc97-99c21d522be2', name: 'Yonex Nanoflare', slug: 'yonex-nanoflare', parent_id: '7f78d44c-2f11-4af4-bb37-a597a68ebead', sort_order: 2 },

      // Level 3 (Victor)
      { id: '2ec4b102-ae91-4495-9350-9471b2d3445d', name: 'Victor Thruster', slug: 'victor-thruster', parent_id: '58529a82-fc87-4edb-924f-fc7e68d07a59', sort_order: 1 },
      { id: '1ca053cf-ad59-4781-a75a-f10421b6ab32', name: 'Victor Jetspeed', slug: 'victor-jetspeed', parent_id: '58529a82-fc87-4edb-924f-fc7e68d07a59', sort_order: 2 },

      // Level 3 (Lining)
      { id: '0c0d66cc-dae1-44e4-9cde-593b8dbb7814', name: 'Lining N9', slug: 'lining-n9', parent_id: 'fbede5ad-f454-438b-957c-b2f8776b994d', sort_order: 1 },
      { id: '02865c08-3415-4e76-9c91-83f80be4c1d1', name: 'Lining Windstorm', slug: 'lining-windstorm', parent_id: 'fbede5ad-f454-438b-957c-b2f8776b994d', sort_order: 2 },

      // Level 3 (Cước)
      { id: 'b95df19d-d094-4952-a482-076009541d2a', name: 'Cước mỏng', slug: 'cuoc-mong', parent_id: 'b6ccae8b-bf6f-4427-964a-44c032a07109', sort_order: 1 },
      { id: 'd9f55865-3af1-4f8d-89c2-da1c13407ee0', name: 'Cước dày', slug: 'cuoc-day', parent_id: 'b6ccae8b-bf6f-4427-964a-44c032a07109', sort_order: 2 },

      // Level 3 (Phụ kiện vợt)
      { id: 'acf0c1ef-21bd-4f25-addd-c9e1c34426ea', name: 'Tay cầm & Grip', slug: 'tay-cam-grip', parent_id: '1359cf89-cd3c-4f28-9750-afbfcfd1e74d', sort_order: 1 },
      { id: '01baf96f-828a-4050-9963-3a7f873a83ef', name: 'Giảm chấn', slug: 'giam-chan', parent_id: '1359cf89-cd3c-4f28-9750-afbfcfd1e74d', sort_order: 2 }
    ];

    const catInsertQuery = `
      INSERT INTO categories (id, name, slug, parent_id, sort_order)
      VALUES ($1, $2, $3, $4, $5)
    `;

    for (const cat of categoriesToSeed) {
      await client.query(catInsertQuery, [cat.id, cat.name, cat.slug, cat.parent_id, cat.sort_order]);
    }

    const mapCategory = (name) => {
      const match = categoriesToSeed.find(c => c.name === name || c.slug === name);
      if (match) return match.id;
      return '7c36020b-9a5d-4883-9730-0946b7c53740'; // fallback to Vợt cầu lông root
    };

    // 4. Dữ liệu Sản phẩm
    const productsData = [
      { 
        name: 'Yonex Astrox 88D Pro (Gen 3)', 
        desc: 'Trọng lượng: 4U, Cán: G5. Điểm cân bằng: Nặng đầu. Sức căng: 28lbs. Công nghệ: Rotational Generator System.', 
        price: 4250000, 
        stock: 25, 
        cat: 'Yonex Astrox',
        images: ['/uploads/products/astrox-88d.png']
      },
      { 
        name: 'Yonex Nanoflare 1000Z', 
        desc: 'Trọng lượng: 4U, Cán: G5. Dòng vợt siêu tốc độ, thân cứng, đầu cân bằng. Phù hợp đánh đôi, phản tạt.', 
        price: 4100000, 
        stock: 15, 
        cat: 'Yonex Nanoflare',
        images: ['/uploads/products/nanoflare-1000z.png']
      },
      { 
        name: 'Lining Axforce 80', 
        desc: 'Trọng lượng: 3U/4U. Thân vợt linh hoạt, thiên công mạnh mẽ. Sức căng tối đa: 30lbs.', 
        price: 3850000, 
        stock: 12, 
        cat: 'Vợt Lining',
        images: ['/uploads/products/axforce-80.png']
      },
      { 
        name: 'Lining Halbertec 8000', 
        desc: 'Trọng lượng: 4U, Cán: G5. Dòng vợt kiểm soát cầu toàn diện, cân bằng giữa công và thủ.', 
        price: 3700000, 
        stock: 20, 
        cat: 'Vợt Lining',
        images: ['/uploads/products/halbertec-8000.png']
      },
      { 
        name: 'Victor Thruster Ryuga II', 
        desc: 'Trọng lượng: 3U/4U. Vợt thiên công, thân cứng vừa phải, sức căng cực cao lên đến 31lbs.', 
        price: 3600000, 
        stock: 10, 
        cat: 'Victor Thruster',
        images: ['/uploads/products/ryuga-ii.png']
      },
      { 
        name: 'Victor Brave Sword 12 SE', 
        desc: 'Trọng lượng: 3U/4U. Khung vợt kim cương xé gió, huyền thoại của Victor cho lối đánh tốc độ.', 
        price: 3100000, 
        stock: 30, 
        cat: 'Vợt Victor',
        images: ['/uploads/products/brave-sword-12.png']
      },
      { 
        name: 'Yonex Arcsaber 11 Pro', 
        desc: 'Trọng lượng: 4U, Cán: G5. Vợt công thủ toàn diện, điều cầu cực kỳ chính xác.', 
        price: 4050000, 
        stock: 18, 
        cat: 'Vợt Yonex',
        images: ['/uploads/products/arcsaber-11-pro.png']
      },
      { 
        name: 'Giày Yonex 65Z3 Wide', 
        desc: 'Giày chuyên dụng cầu lông cao cấp. Đệm Power Cushion+. Màu: Trắng/Xanh. Size: 39-44.', 
        price: 2800000, 
        stock: 45, 
        cat: 'Giày nam',
        images: ['/uploads/products/yonex-65z3.png']
      },
      { 
        name: 'Cước Yonex BG66 Ultimax', 
        desc: 'Đường kính: 0.65mm. Cước cho độ nảy cao, tiếng nổ đanh. Màu: Trắng, Vàng, Cam.', 
        price: 180000, 
        stock: 200, 
        cat: 'Cước mỏng',
        images: ['/uploads/products/bg66-ultimax.png']
      },
      { 
        name: 'Quấn cán Yonex AC102EX', 
        desc: 'Chất liệu cao su non bám tay, thấm hút mồ hôi tốt. Vỉ 3 cái.', 
        price: 120000, 
        stock: 500, 
        cat: 'Tay cầm & Grip',
        images: ['/uploads/products/ac102ex-grip.png']
      }
    ];

    const productQuery = `
      INSERT INTO products (vendor_id, category_id, name, description, price, stock, image_urls, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
      RETURNING id
    `;

    for (const p of productsData) {
      const catId = mapCategory(p.cat);
      await client.query(productQuery, [
        vendorId, 
        catId, 
        p.name, 
        p.desc, 
        p.price, 
        p.stock, 
        JSON.stringify(p.images)
      ]);
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
