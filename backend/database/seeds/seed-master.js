const bcrypt = require('bcrypt');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function seedMaster() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('[seeder] Cleaning up existing data (Truncating tables)...');
    await client.query('TRUNCATE TABLE reviews, return_requests, qa, cart_items, order_items, sub_orders, orders, wallet_transactions, products, categories, vendors, users, fee_tier_items, fee_tiers CASCADE;');

    // 0. Tạo Fee Tiers & Fee Tier Items
    const standardTierId = 'a1f8c142-2b3e-4c7a-9db1-765ef399675c';
    const verifiedTierId = 'b2f9d253-3c4f-5d8b-0ec2-876fa400786d';

    await client.query(`
      INSERT INTO fee_tiers (id, tier_name, description)
      VALUES ($1, $2, $3)
    `, [standardTierId, 'Hạng Thường', 'Dành cho shop mới tạo, chưa định danh. Mức phí cao hơn để bù đắp rủi ro vận hành.']);

    await client.query(`
      INSERT INTO fee_tiers (id, tier_name, description)
      VALUES ($1, $2, $3)
    `, [verifiedTierId, 'Hạng Đã Xác Thực', 'Gói ưu đãi đặc biệt dành cho các shop đã hoàn tất xác thực danh tính (KYC).']);

    console.log('[seeder] Fee Tiers created');

    const feeItemQuery = `
      INSERT INTO fee_tier_items (fee_tier_id, fee_name, fee_type, fee_value)
      VALUES ($1, $2, $3, $4)
    `;

    // Items cho Hạng Thường (Standard)
    await client.query(feeItemQuery, [standardTierId, 'Phí sàn phần trăm', 'percentage', 5.00]);
    await client.query(feeItemQuery, [standardTierId, 'Phí cố định', 'fixed', 2000.00]);

    // Items cho Hạng Đã Xác Thực (Verified)
    await client.query(feeItemQuery, [verifiedTierId, 'Phí sàn phần trăm', 'percentage', 3.00]);
    await client.query(feeItemQuery, [verifiedTierId, 'Phí cố định', 'fixed', 1000.00]);

    console.log('[seeder] Fee Tier Items created');

    // 1. Dữ liệu Tài khoản
    const saltRounds = 12;
    const defaultPasswordHash = await bcrypt.hash('password123', saltRounds);
    const adminPasswordHash = await bcrypt.hash('admin123@<>', saltRounds);
    const customer1PasswordHash = await bcrypt.hash('12345678', saltRounds);
    const customer2PasswordHash = await bcrypt.hash('dung123xzx', saltRounds);

    const userQuery = `
      INSERT INTO users (id, name, email, password_hash, role, status, phone, address)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `;

    // Admin User
    const adminId = '4f433f8b-30da-4626-99ac-a5875299675c';
    await client.query(userQuery, [
      adminId,
      'Admin User',
      'admin@reshop.vn',
      adminPasswordHash,
      'admin',
      'active',
      '0123456789',
      'Trụ sở chính Reshop, Hà Nội'
    ]);
    console.log('[seeder] Admin user created');

    // Vendor 1: Cầu Lông Pro (contact@caulongstore.com)
    const vendor1UserId = 'ee067f5e-8882-4d32-89ce-714786c04165';
    await client.query(userQuery, [
      vendor1UserId,
      'Chủ shop Cầu Lông Pro',
      'contact@caulongstore.com',
      defaultPasswordHash,
      'vendor',
      'active',
      '0987654321',
      '12 Lê Lợi, TP. Vinh, Nghệ An'
    ]);
    console.log('[seeder] Vendor 1 owner user created');

    // Vendor 2: Thế Giới Cầu Lông (contact2@caulongstore.com)
    const vendor2UserId = 'a2b1c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d';
    await client.query(userQuery, [
      vendor2UserId,
      'Chủ shop Thế Giới Cầu Lông',
      'contact2@caulongstore.com',
      defaultPasswordHash,
      'vendor',
      'active',
      '0912345678',
      '456 Nguyễn Văn Cừ, TP. Hồ Chí Minh'
    ]);
    console.log('[seeder] Vendor 2 owner user created');

    // Customer 1: phuongthuy@reshop.vn
    const customer1UserId = 'f1f2f3f4-f5f6-7777-8888-999999999999';
    await client.query(userQuery, [
      customer1UserId,
      'Phương Thúy',
      'phuongthuy@reshop.vn',
      customer1PasswordHash,
      'customer',
      'active',
      '0933333333',
      'Hà Nội'
    ]);

    // Customer 2: acerikyl@gmail.com
    const customer2UserId = 'a1a2a3a4-a5a6-7777-8888-999999999999';
    await client.query(userQuery, [
      customer2UserId,
      'Acerikyl',
      'acerikyl@gmail.com',
      customer2PasswordHash,
      'customer',
      'active',
      '0944444444',
      'TP. Hồ Chí Minh'
    ]);
    console.log('[seeder] Customer users created');

    // 2. Tạo Vendors
    const vendorQuery = `
      INSERT INTO vendors (id, user_id, store_name, slug, status, commission_rate, bank_info, fee_tier_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;

    const vendor1Id = '11111111-1111-1111-1111-111111111111';
    await client.query(vendorQuery, [
      vendor1Id,
      vendor1UserId,
      'Cầu Lông Pro',
      'cau-long-pro',
      'active',
      5.00,
      JSON.stringify({ bank: 'Vietcombank', account_no: '1012345678', owner: 'NGUYEN VAN A' }),
      standardTierId
    ]);

    const vendor2Id = '46c52822-e353-428b-a9ff-1d55ec5341a2';
    await client.query(vendorQuery, [
      vendor2Id,
      vendor2UserId,
      'Thế Giới Cầu Lông',
      'the-gioi-cau-long',
      'active',
      5.00,
      JSON.stringify({ bank: 'Techcombank', account_no: '1903333333', owner: 'NGUYEN VAN B' }),
      standardTierId
    ]);
    console.log('[seeder] Vendors created');

    // 3. Bảng Danh mục
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
    console.log('[seeder] Categories seeded');

    const mapCategory = (name) => {
      const match = categoriesToSeed.find(c => c.name === name || c.slug === name);
      if (match) return match.id;
      return '7c36020b-9a5d-4883-9730-0946b7c53740'; // fallback
    };

    // 4. Products Data for Vendor 1 (Cầu Lông Pro)
    const productsVendor1 = [
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

    // Products Data for Vendor 2 (Thế Giới Cầu Lông)
    const productsVendor2 = [
      { 
        name: 'Mizuno Fortius 10 Quick', 
        desc: 'Trọng lượng: 4U. Vợt thiên về phản tạt, tốc độ vung vợt cực nhanh. Thiết kế tối ưu cho dòng đánh đôi.', 
        price: 3950000, 
        stock: 12, 
        cat: 'Vợt Mizuno',
        images: ['/uploads/products/mizuno-fortius-10-quick.png']
      },
      { 
        name: 'Kumpoo Power Control K520 Pro', 
        desc: 'Trọng lượng: 4U, Cán: G5. Thân vợt dẻo, trợ lực cực tốt, điểm ngọt lớn phù hợp cho người mới bắt đầu.', 
        price: 650000, 
        stock: 80, 
        cat: 'Vợt Kumpoo',
        images: ['/uploads/products/kumpoo-power-control-k520-pro.png']
      },
      { 
        name: 'Giày Lining AYTS012', 
        desc: 'Giày form rộng, đế cao su chống mài mòn cao. Tích hợp công nghệ đệm giảm chấn Cloud êm ái. Màu: Đen/Đỏ.', 
        price: 1450000, 
        stock: 35, 
        cat: 'Giày cầu lông',
        images: ['/uploads/products/giay-lining-ayts012.png']
      },
      { 
        name: 'Giày Victor P9200II', 
        desc: 'Dòng giày siêu êm ái của Victor. Trang bị hệ thống đệm Energymax 3.0 và công nghệ chống lật cổ chân an toàn.', 
        price: 2500000, 
        stock: 25, 
        cat: 'Giày cầu lông',
        images: ['/uploads/products/giay-victor-p9200ii.png']
      },
      { 
        name: 'Balo Yonex BA82012EX', 
        desc: 'Balo thể thao đa năng, có ngăn chứa giày và vợt riêng biệt. Kích thước: 33x25.5x50 cm, chất liệu chống nước nhẹ.', 
        price: 1150000, 
        stock: 40, 
        cat: 'Balo & Túi',
        images: ['/uploads/products/balo-yonex-ba82012ex.png']
      },
      { 
        name: 'Túi cầu lông Lining ABJS037', 
        desc: 'Túi chữ nhật 2 ngăn lớn, trang bị lớp cách nhiệt bảo vệ khung vợt. Sức chứa tối đa lên đến 6 cây vợt.', 
        price: 1200000, 
        stock: 15, 
        cat: 'Balo & Túi',
        images: ['/uploads/products/tui-cau-long-lining-abjs037.png']
      },
      { 
        name: 'Ống cầu lông Vina Star', 
        desc: 'Quả cầu lông tiêu chuẩn thi đấu, tốc độ 76. Độ bền lông cao, quỹ đạo bay ổn định. (Đóng gói: Ống 12 quả).', 
        price: 220000, 
        stock: 300, 
        cat: 'Phụ kiện',
        images: ['/uploads/products/ong-cau-long-vina-star.png']
      },
      { 
        name: 'Cước Lining No.1', 
        desc: 'Đường kính: 0.65mm. Dòng cước trợ lực, độ nảy cực tốt và âm thanh đanh rát, đối thủ cạnh tranh của BG66U.', 
        price: 150000, 
        stock: 150, 
        cat: 'Cước & Dây',
        images: ['/uploads/products/cuoc-lining-no-1.png']
      },
      { 
        name: 'Quấn cán vải Victor GR334', 
        desc: 'Quấn cán bằng chất liệu vải nhung, siêu thấm hút hôi. Lựa chọn tối ưu cho người chơi ra nhiều mồ hôi tay.', 
        price: 45000, 
        stock: 400, 
        cat: 'Tay cầm & Grip',
        images: ['/uploads/products/quan-can-vai-victor-gr334.png']
      },
      { 
        name: 'Áo cầu lông Yonex 10458EX', 
        desc: 'Chất liệu vải Polyester thoáng khí, ứng dụng công nghệ VeryCool làm mát nhanh chóng. Form dáng thể thao.', 
        price: 650000, 
        stock: 60, 
        cat: 'Áo thi đấu',
        images: ['/uploads/products/ao-cau-long-yonex-10458ex.png']
      }
    ];

    const productQuery = `
      INSERT INTO products (vendor_id, category_id, name, description, price, stock, image_urls, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
    `;

    for (const p of productsVendor1) {
      const catId = mapCategory(p.cat);
      await client.query(productQuery, [
        vendor1Id,
        catId,
        p.name,
        p.desc,
        p.price,
        p.stock,
        JSON.stringify(p.images)
      ]);
    }
    console.log('[seeder] Vendor 1 products seeded');

    for (const p of productsVendor2) {
      const catId = mapCategory(p.cat);
      await client.query(productQuery, [
        vendor2Id,
        catId,
        p.name,
        p.desc,
        p.price,
        p.stock,
        JSON.stringify(p.images)
      ]);
    }
    console.log('[seeder] Vendor 2 products seeded');

    await client.query('COMMIT');
    console.log('[seeder] Master seeding transaction committed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[seeder] Master seeding transaction failed:', err);
    throw err;
  } finally {
    client.release();
    pool.end();
  }
}

seedMaster().catch((e) => {
  console.error('[seeder] Error:', e);
  process.exit(1);
});
