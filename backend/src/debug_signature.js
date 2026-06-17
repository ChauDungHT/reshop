const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Tự động load file .env từ thư mục gốc dự án
function loadEnv() {
  const envPath = path.join(__dirname, '../../.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split(/\r?\n/).forEach(line => {
      // Bỏ qua chú thích hoặc dòng trống
      if (line.trim().startsWith('#') || line.trim() === '') return;
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        // Bỏ dấu nháy nếu có
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.substring(1, value.length - 1);
        } else if (value.startsWith("'") && value.endsWith("'")) {
          value = value.substring(1, value.length - 1);
        }
        process.env[key] = value.trim();
      }
    });
    console.log('✓ Đã load cấu hình từ:', envPath);
  } else {
    console.log('⚠ Không tìm thấy file .env tại:', envPath);
  }
}

loadEnv();

const vnpTmnCode = process.env.VNP_TMN_CODE || 'NKKFNQR2';
const vnpHashSecret = process.env.VNP_HASH_SECRET || 'BSTSEN2NTVPOVL0FWO50DO14U61S46SD';
const vnpUrl = process.env.VNP_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
const vnpReturnUrl = process.env.VNP_RETURN_URL || 'http://localhost:5173/payment/return';

console.log('\n--- CẤU HÌNH VNPAY HIỆN TẠI ---');
console.log('vnp_TmnCode   :', JSON.stringify(vnpTmnCode), `(độ dài: ${vnpTmnCode.length})`);
console.log('vnp_HashSecret:', JSON.stringify(vnpHashSecret), `(độ dài: ${vnpHashSecret.length})`);
console.log('vnp_Url       :', vnpUrl);
console.log('vnp_ReturnUrl :', vnpReturnUrl);

function getGMT7DateString(date) {
  const pad = (num) => String(num).padStart(2, '0');
  
  // Chuyển đổi sang múi giờ GMT+7
  const tzOffset = 7 * 60; // offset tính bằng phút
  const gmt7Time = new Date(date.getTime() + tzOffset * 60 * 1000);
  
  const year = gmt7Time.getUTCFullYear();
  const month = pad(gmt7Time.getUTCMonth() + 1);
  const day = pad(gmt7Time.getUTCDate());
  const hours = pad(gmt7Time.getUTCHours());
  const minutes = pad(gmt7Time.getUTCMinutes());
  const seconds = pad(gmt7Time.getUTCSeconds());

  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

function generatePaymentUrl({ orderCode, amount, ipAddr, orderInfo }) {
  const now = new Date();
  const createDate = getGMT7DateString(now);
  const expireDate = getGMT7DateString(new Date(now.getTime() + 15 * 60000));

  const params = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: vnpTmnCode,
    vnp_Locale: 'vn',
    vnp_CurrCode: 'VND',
    vnp_TxnRef: orderCode,
    vnp_OrderInfo: orderInfo,
    vnp_OrderType: 'other',
    vnp_Amount: String(Math.round(amount) * 100),
    vnp_ReturnUrl: vnpReturnUrl,
    vnp_IpAddr: ipAddr,
    vnp_CreateDate: createDate,
    vnp_ExpireDate: expireDate,
  };

  const sortedKeys = Object.keys(params).sort();
  
  const signQuery = sortedKeys
    .map(key => `${key}=${encodeURIComponent(params[key]).replace(/%20/g, '+')}`)
    .join('&');

  console.log('\n--- CHUỖI DỮ LIỆU ĐƯỢC KÝ (SIGN QUERY) ---');
  console.log(signQuery);

  const secureHash = crypto
    .createHmac('sha512', vnpHashSecret)
    .update(Buffer.from(signQuery, 'utf-8'))
    .digest('hex');

  return `${vnpUrl}?${signQuery}&vnp_SecureHash=${secureHash}`;
}

const testUrl = generatePaymentUrl({
  orderCode: 'ORD-' + getGMT7DateString(new Date()),
  amount: 10000,
  ipAddr: '127.0.0.1',
  orderInfo: 'Test thanh toan don hang',
});

console.log('\n--- LINK THANH TOÁN TEST TẠO THÀNH CÔNG (10.000₫) ---');
console.log(testUrl);
console.log('\nHãy copy link trên và dán vào trình duyệt để test. Nếu hiển thị màn hình nhập thẻ NCB thì chữ ký đã đúng.');
