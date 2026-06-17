const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');

// 1. Load config từ file .env ở thư mục gốc dự án
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
  console.log('✓ Đã load cấu hình từ:', envPath);
} else {
  console.log('⚠ Không tìm thấy file .env tại:', envPath);
}

const config = {
  vnpTmnCode: process.env.VNP_TMN_CODE || 'NKKFNQR2',
  vnpHashSecret: process.env.VNP_HASH_SECRET || 'BSTSEN2NTVPOVL0FWO50DO14U61S46SD',
  vnpUrl: process.env.VNP_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
  vnpReturnUrl: process.env.VNP_RETURN_URL || 'http://localhost:5173/payment/return',
  databaseUrl: process.env.DATABASE_URL || 
    `postgres://${process.env.POSTGRES_USER || 'postgres'}:${process.env.POSTGRES_PASSWORD || 'password'}@localhost:5433/${process.env.POSTGRES_DB || 'cdshop'}`,
  serverPort: process.env.PORT || 8000
};

// 2. Khởi tạo kết nối PostgreSQL
const pool = new Pool({
  connectionString: config.databaseUrl,
});

function getGMT7DateString(date) {
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  const gmt7 = new Date(utc + 3600000 * 7);

  const pad = (n) => String(n).padStart(2, '0');
  return `${gmt7.getFullYear()}${pad(gmt7.getMonth() + 1)}${pad(gmt7.getDate())}${pad(gmt7.getHours())}${pad(gmt7.getMinutes())}${pad(gmt7.getSeconds())}`;
}

function generatePaymentUrl({ orderCode, amount, ipAddr, orderInfo }) {
  const now = new Date();
  const createDate = getGMT7DateString(now);
  const expireDate = getGMT7DateString(new Date(now.getTime() + 15 * 60000));

  let cleanIp = ipAddr;
  if (cleanIp.includes('::ffff:')) {
    cleanIp = cleanIp.replace('::ffff:', '');
  }
  if (cleanIp === '::1' || cleanIp === 'localhost') {
    cleanIp = '127.0.0.1';
  }

  const params = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: config.vnpTmnCode,
    vnp_Locale: 'vn',
    vnp_CurrCode: 'VND',
    vnp_TxnRef: orderCode,
    vnp_OrderInfo: orderInfo,
    vnp_OrderType: 'other',
    vnp_Amount: String(Math.round(amount) * 100),
    vnp_ReturnUrl: config.vnpReturnUrl,
    vnp_IpAddr: cleanIp,
    vnp_CreateDate: createDate,
    vnp_ExpireDate: expireDate,
  };

  const sortedKeys = Object.keys(params).sort();
  
  const signQuery = sortedKeys
    .map(key => `${key}=${encodeURIComponent(params[key]).replace(/%20/g, '+')}`)
    .join('&');

  const secureHash = crypto
    .createHmac('sha512', config.vnpHashSecret)
    .update(Buffer.from(signQuery, 'utf-8'))
    .digest('hex');

  return `${config.vnpUrl}?${signQuery}&vnp_SecureHash=${secureHash}`;
}

function generateSimulatedIpnParams({ orderCode, amount, responseCode = '00' }) {
  const now = new Date();
  const payDate = getGMT7DateString(now);
  
  const params = {
    vnp_Amount: String(Math.round(amount) * 100),
    vnp_BankCode: 'NCB',
    vnp_BankTranNo: 'VNP12345678',
    vnp_CardType: 'ATM',
    vnp_OrderInfo: 'Nap tien vao vi ReShop',
    vnp_PayDate: payDate,
    vnp_ResponseCode: responseCode,
    vnp_TmnCode: config.vnpTmnCode,
    vnp_TransactionNo: 'VNP12345678',
    vnp_TransactionStatus: responseCode,
    vnp_TxnRef: orderCode,
    vnp_Version: '2.1.0',
  };

  const sortedKeys = Object.keys(params).sort();
  
  const signQuery = sortedKeys
    .map(key => `${key}=${encodeURIComponent(params[key]).replace(/%20/g, '+')}`)
    .join('&');

  const secureHash = crypto
    .createHmac('sha512', config.vnpHashSecret)
    .update(Buffer.from(signQuery, 'utf-8'))
    .digest('hex');

  return `${signQuery}&vnp_SecureHash=${secureHash}`;
}

async function runCompleteTest() {
  console.log('=== KHỞI ĐỘNG VNPAY INTEGRATION TEST ===\n');
  let tempUserCreated = false;
  let testUserId = null;

  try {
    // 1. Lấy hoặc tạo người dùng test để thực hiện giao dịch
    const userRes = await pool.query("SELECT id, name, email, wallet_balance FROM users WHERE status = 'active' LIMIT 1");
    let user;
    if (userRes.rows.length === 0) {
      console.log('⚠ Không có người dùng active nào trong DB. Tiến hành tạo người dùng test tạm thời...');
      const insertUserRes = await pool.query(
        `INSERT INTO users (name, email, password_hash, role, status, wallet_balance) 
         VALUES ($1, $2, $3, $4, $5, $6) 
         RETURNING id, name, email, wallet_balance`,
        ['Test User', 'vnpay_test@reshop.vn', 'hash_placeholder', 'customer', 'active', 0]
      );
      user = insertUserRes.rows[0];
      tempUserCreated = true;
      testUserId = user.id;
      console.log('✓ Đã tạo người dùng test tạm thời.');
    } else {
      user = userRes.rows[0];
      testUserId = user.id;
    }

    const initialBalance = parseFloat(user.wallet_balance);
    console.log(`👤 Người dùng được chọn để test:`);
    console.log(`   - ID: ${user.id}`);
    console.log(`   - Tên: ${user.name}`);
    console.log(`   - Email: ${user.email}`);
    console.log(`   - Số dư ví ban đầu: ${initialBalance.toLocaleString()}₫\n`);

    // 2. Tạo mã giao dịch nạp tiền ví (WL-...)
    const topupAmount = 50000; // 50,000 VND
    const orderCode = `WL-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;
    console.log(`🆕 1. Khởi tạo giao dịch nạp tiền:`);
    console.log(`   - Mã giao dịch (txn_ref): ${orderCode}`);
    console.log(`   - Số tiền nạp: ${topupAmount.toLocaleString()}₫`);

    // 3. Insert transaction vào vnpay_transactions (Như khi nhấn nạp tiền ở client)
    await pool.query(
      `INSERT INTO vnpay_transactions (
         txn_ref, command, amount, raw_request
       ) VALUES ($1, $2, $3, $4)`,
      [
        orderCode,
        'topup',
        topupAmount,
        JSON.stringify({ userId: user.id }),
      ]
    );
    console.log(`   - Đã lưu giao dịch khởi tạo vào bảng vnpay_transactions.`);

    // 4. Tạo URL thanh toán
    const paymentUrl = generatePaymentUrl({
      orderCode,
      amount: topupAmount,
      ipAddr: '127.0.0.1',
      orderInfo: 'Nap tien vao vi ReShop',
    });
    console.log(`   - URL thanh toán: ${paymentUrl}\n`);

    // 5. Giả lập VNPay gửi phản hồi (IPN callback) tới server
    console.log(`📡 2. Giả lập VNPay gửi IPN Callback:`);
    const ipnQueryParams = generateSimulatedIpnParams({
      orderCode,
      amount: topupAmount,
      responseCode: '00'
    });
    const ipnUrl = `http://localhost:${config.serverPort}/api/payment/vnpay-ipn?${ipnQueryParams}`;
    console.log(`   - Gửi yêu cầu GET tới IPN Endpoint:`);
    console.log(`     ${ipnUrl}`);

    const response = await fetch(ipnUrl);
    const responseData = await response.json();
    console.log(`   - Phản hồi từ server:`, responseData);

    if (responseData.RspCode !== '00') {
      console.log(`\n❌ Lỗi: Server xử lý IPN thất bại với phản hồi:`, responseData);
      return;
    }
    console.log(`   - Server trả về RspCode: '00' (Xác nhận thành công).\n`);

    // 6. Kiểm tra lại kết quả trong Database sau khi xử lý IPN
    console.log(`🔍 3. Kiểm tra cơ sở dữ liệu sau thanh toán:`);
    
    // a) Kiểm tra số dư ví mới của người dùng
    const userCheck = await pool.query("SELECT wallet_balance FROM users WHERE id = $1", [user.id]);
    const finalBalance = parseFloat(userCheck.rows[0].wallet_balance);
    const balanceDiff = finalBalance - initialBalance;
    console.log(`   - Số dư ví sau test: ${finalBalance.toLocaleString()}₫`);
    console.log(`   - Chênh lệch số dư: +${balanceDiff.toLocaleString()}₫ (Kỳ vọng: +${topupAmount.toLocaleString()}₫)`);

    // b) Kiểm tra cập nhật trong vnpay_transactions
    const txnCheck = await pool.query(
      "SELECT response_code, transaction_status, transaction_no FROM vnpay_transactions WHERE txn_ref = $1",
      [orderCode]
    );
    const txn = txnCheck.rows[0];
    console.log(`   - Trạng thái trong vnpay_transactions:`);
    console.log(`     + response_code: '${txn.response_code}' (Kỳ vọng: '00')`);
    console.log(`     + transaction_status: '${txn.transaction_status}' (Kỳ vọng: '00')`);
    console.log(`     + transaction_no: '${txn.transaction_no}' (Kỳ vọng: 'VNP12345678')`);

    // c) Kiểm tra log trong wallet_transactions
    const walletTxnCheck = await pool.query(
      "SELECT amount, type, balance_after FROM wallet_transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1",
      [user.id]
    );
    const walletTxn = walletTxnCheck.rows[0];
    console.log(`   - Giao dịch ví mới nhất trong wallet_transactions:`);
    console.log(`     + Số tiền: +${parseFloat(walletTxn.amount).toLocaleString()}₫ (Kỳ vọng: +${topupAmount.toLocaleString()}₫)`);
    console.log(`     + Loại giao dịch: '${walletTxn.type}' (Kỳ vọng: 'deposit')`);
    console.log(`     + Số dư sau GD: ${parseFloat(walletTxn.balance_after).toLocaleString()}₫ (Kỳ vọng: ${finalBalance.toLocaleString()}₫)\n`);

    // 7. Tổng kết đánh giá kết quả kiểm thử
    const isSuccess = 
      balanceDiff === topupAmount && 
      txn.response_code === '00' && 
      walletTxn.type === 'deposit' && 
      parseFloat(walletTxn.amount) === topupAmount;

    if (isSuccess) {
      console.log('✅ KẾT LUẬN: THỬ NGHIỆM GIAO DỊCH HOÀN TẤT THÀNH CÔNG RỰC RỠ!');
      console.log('   Hệ thống ReShop đã tích hợp chính xác chữ ký, xử lý IPN và cập nhật database hoàn chỉnh.');
    } else {
      console.log('❌ KẾT LUẬN: THỬ NGHIỆM THẤT BẠI. Dữ liệu sau thanh toán không khớp kỳ vọng.');
    }

  } catch (error) {
    console.error('\n❌ Có lỗi xảy ra trong quá trình chạy test:', error);
  } finally {
    // Dọn dẹp người dùng test tạm thời nếu được tạo ra
    if (tempUserCreated && testUserId) {
      try {
        console.log('\n🧹 Dọn dẹp dữ liệu test tạm thời...');
        await pool.query("DELETE FROM wallet_transactions WHERE user_id = $1", [testUserId]);
        await pool.query("DELETE FROM users WHERE id = $1", [testUserId]);
        console.log('✓ Đã xóa người dùng test tạm thời.');
      } catch (cleanupErr) {
        console.error('⚠ Không thể xóa dữ liệu test tạm thời:', cleanupErr.message);
      }
    }
    await pool.end();
    console.log('\n=== ĐÃ ĐÓNG KẾT NỐI DATABASE ===');
  }
}

runCompleteTest();
