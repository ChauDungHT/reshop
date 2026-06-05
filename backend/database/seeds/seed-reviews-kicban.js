const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

const connectionString = process.env.DATABASE_URL || 
  `postgres://${process.env.POSTGRES_USER || 'postgres'}:${process.env.POSTGRES_PASSWORD || 'password'}@localhost:5433/${process.env.POSTGRES_DB || 'cdshop'}`;

const pool = new Pool({
  connectionString,
});

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log('[seeder] Bắt đầu tự động hóa kịch bản đánh giá...');

    // 1. Đọc và parse file review.md
    let reviewFilePath = path.join(__dirname, '../../../tool/review.md');
    if (!fs.existsSync(reviewFilePath)) {
      reviewFilePath = path.join(__dirname, '../../tool/review.md');
    }
    const reviewContent = fs.readFileSync(reviewFilePath, 'utf8');
    const lines = reviewContent.split('\n');
    
    const reviews = [];
    let currentRating = 5;

    for (let line of lines) {
      line = line.trim();
      if (!line) continue;
      
      if (line.includes('Đánh giá Tích cực')) currentRating = 5;
      else if (line.includes('Đánh giá Trung lập')) currentRating = 3;
      else if (line.includes('Đánh giá Tiêu cực')) currentRating = 1;

      const match = line.match(/^\d+\.\s+\*\*(.+?)\*\*:\s+(.*)$/);
      if (match) {
        reviews.push({
          productName: match[1].trim(),
          comment: match[2].trim(),
          rating: currentRating
        });
      }
    }

    console.log(`[seeder] Phân tích thành công ${reviews.length} bài đánh giá.`);
    if (reviews.length !== 60) {
      console.warn(`[seeder] CẢNH BÁO: Số bài đánh giá tìm thấy là ${reviews.length}, kịch bản cần 60.`);
    }

    // 2. Xử lý Users (phuongthuy@reshop.vn và acerikyl@gmail.com)
    const emails = ['phuongthuy@reshop.vn', 'acerikyl@gmail.com'];
    const userIds = [];
    
    for (const email of emails) {
      let res = await client.query('SELECT id FROM users WHERE email = $1', [email]);
      if (res.rows.length === 0) {
        console.log(`[seeder] Tài khoản ${email} chưa tồn tại, đang tạo mới...`);
        const passwordHash = await bcrypt.hash(email === 'phuongthuy@reshop.vn' ? '12345678' : 'dung123xzx', 10);
        res = await client.query(
          `INSERT INTO users (name, email, password_hash, role, status) VALUES ($1, $2, $3, 'customer', 'active') RETURNING id`,
          [email.split('@')[0], email, passwordHash]
        );
      }
      userIds.push(res.rows[0].id);
    }
    const [phuongThuyId, acerikylId] = userIds;

    // 3. Lấy thông tin 2 shop
    const vendorRes = await client.query("SELECT id, store_name FROM vendors WHERE store_name IN ('Cầu Lông Pro', 'Thế Giới Cầu Lông (Updated)', 'Thế Giới Cầu Lông')");
    if (vendorRes.rows.length < 2) {
      throw new Error("Không tìm thấy đủ 2 shop trong database. Kiểm tra lại dữ liệu hạt giống (seed-data).");
    }
    const vendors = vendorRes.rows;

    // Lấy trước map tất cả product ID theo tên để xử lý nhanh
    const prodRes = await client.query("SELECT id, name, price, vendor_id FROM products");
    const productMap = new Map();
    prodRes.rows.forEach(p => productMap.set(p.name, p));

    // Lấy một category ID làm mặc định cho sản phẩm tạo động
    const catRes = await client.query("SELECT id FROM categories LIMIT 1");
    const defaultCategoryId = catRes.rows[0]?.id;

    // Lấy ID của Thế Giới Cầu Lông làm mặc định
    const tgclVendor = vendors.find(v => v.store_name.includes('Thế Giới Cầu Lông'));
    const defaultVendorId = tgclVendor ? tgclVendor.id : vendors[0].id;

    // 4. Tạo Đơn hàng và Đánh giá
    // Kịch bản: phuongthuy đánh giá 30 bài đầu, acerikyl đánh giá 30 bài sau
    for (let i = 0; i < reviews.length; i++) {
      const review = reviews[i];
      const buyerId = i < 30 ? phuongThuyId : acerikylId;
      
      let targetProduct = productMap.get(review.productName);
      if (!targetProduct) {
        console.log(`[seeder] Tạo động sản phẩm thiếu: "${review.productName}"`);
        const insertProdRes = await client.query(
          `INSERT INTO products (vendor_id, category_id, name, description, price, stock, image_urls, status)
           VALUES ($1, $2, $3, $4, 150000, 100, '[]', 'active') RETURNING id, name, price, vendor_id`,
          [defaultVendorId, defaultCategoryId, review.productName, `Sản phẩm tự động tạo phục vụ kịch bản đánh giá: ${review.productName}`]
        );
        targetProduct = insertProdRes.rows[0];
        productMap.set(targetProduct.name, targetProduct);
        prodRes.rows.push(targetProduct);
      }

      // Chọn random 1 sản phẩm từ shop còn lại để nhét vào order cho đủ kịch bản (mỗi đơn 2 sản phẩm từ 2 shop)
      const otherVendor = vendors.find(v => v.id !== targetProduct.vendor_id) || vendors[0];
      const otherProductList = prodRes.rows.filter(p => p.vendor_id === otherVendor.id);
      const randomOtherProduct = otherProductList[Math.floor(Math.random() * otherProductList.length)] || targetProduct;

      // Tính tổng tiền
      const totalAmount = parseFloat(targetProduct.price) + parseFloat(randomOtherProduct.price);
      const orderCode = `KICBAN-${Date.now()}-${i}`;

      // Insert Order
      const orderInsert = await client.query(
        `INSERT INTO orders (buyer_id, order_code, total_amount, status, created_at)
         VALUES ($1, $2, $3, 'delivered', NOW() - interval '1 day') RETURNING id`,
        [buyerId, orderCode, totalAmount]
      );
      const orderId = orderInsert.rows[0].id;

      // Phân tách sub_orders
      // 1. Sub_order cho shop có sản phẩm được review
      const so1 = await client.query(
        `INSERT INTO sub_orders (order_id, vendor_id, sub_order_code, status, subtotal)
         VALUES ($1, $2, $3, 'delivered', $4) RETURNING id`,
        [orderId, targetProduct.vendor_id, `${orderCode}-A`, targetProduct.price]
      );
      // Insert order_item 1
      await client.query(
        `INSERT INTO order_items (order_id, sub_order_id, product_id, quantity, price_snapshot)
         VALUES ($1, $2, $3, 1, $4)`,
        [orderId, so1.rows[0].id, targetProduct.id, targetProduct.price]
      );

      // 2. Sub_order cho shop còn lại
      if (otherVendor.id !== targetProduct.vendor_id) {
        const so2 = await client.query(
          `INSERT INTO sub_orders (order_id, vendor_id, sub_order_code, status, subtotal)
           VALUES ($1, $2, $3, 'delivered', $4) RETURNING id`,
          [orderId, otherVendor.id, `${orderCode}-B`, randomOtherProduct.price]
        );
        // Insert order_item 2
        await client.query(
          `INSERT INTO order_items (order_id, sub_order_id, product_id, quantity, price_snapshot)
           VALUES ($1, $2, $3, 1, $4)`,
          [orderId, so2.rows[0].id, randomOtherProduct.id, randomOtherProduct.price]
        );
      }

      // 5. Insert Review
      await client.query(
        `INSERT INTO reviews (order_id, product_id, user_id, stars, comment, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [orderId, targetProduct.id, buyerId, review.rating, review.comment]
      );
    }

    console.log('[seeder] Đã insert thành công tất cả đơn hàng giả định và đánh giá!');
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[seeder] Lỗi trong quá trình chạy script:', error);
  } finally {
    client.release();
    pool.end();
  }
}

seed();
