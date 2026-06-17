import crypto from 'crypto';
import { config } from '../../core/config';

/**
 * Định dạng Date thành yyyyMMddHHmmss theo múi giờ GMT+7 độc lập với timezone của server chạy.
 */
export function getGMT7DateString(date: Date): string {
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  const gmt7 = new Date(utc + 3600000 * 7);

  const pad = (n: number) => String(n).padStart(2, '0');
  return `${gmt7.getFullYear()}${pad(gmt7.getMonth() + 1)}${pad(gmt7.getDate())}${pad(gmt7.getHours())}${pad(gmt7.getMinutes())}${pad(gmt7.getSeconds())}`;
}

/**
 * Tạo URL thanh toán VNPAY
 */
export function generatePaymentUrl({
  orderCode,
  amount,
  ipAddr,
  orderInfo,
}: {
  orderCode: string;
  amount: number;
  ipAddr: string;
  orderInfo: string;
}): string {
  const now = new Date();
  const createDate = getGMT7DateString(now);
  const expireDate = getGMT7DateString(new Date(now.getTime() + 15 * 60000)); // Hết hạn sau 15 phút

  let cleanIp = ipAddr;
  if (cleanIp.includes('::ffff:')) {
    cleanIp = cleanIp.replace('::ffff:', '');
  }
  if (cleanIp === '::1' || cleanIp === 'localhost') {
    cleanIp = '127.0.0.1';
  }
  const ipv4Regex = /^((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)\.?\b){4}$/;
  if (!ipv4Regex.test(cleanIp)) {
    cleanIp = '127.0.0.1';
  }

  const params: Record<string, string> = {
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
  
  // VNPAY 2.1.0 yêu cầu urlencode các tham số và thay thế khoảng trắng bằng dấu cộng '+'
  const signQuery = sortedKeys
    .map(key => `${key}=${encodeURIComponent(params[key]).replace(/%20/g, '+')}`)
    .join('&');

  const secureHash = crypto
    .createHmac('sha512', config.vnpHashSecret)
    .update(Buffer.from(signQuery, 'utf-8'))
    .digest('hex');

  return `${config.vnpUrl}?${signQuery}&vnp_SecureHash=${secureHash}`;
}

/**
 * Xác minh chữ ký phản hồi từ VNPAY
 */
export function verifyPaymentSignature(queryParams: Record<string, string>): boolean {
  const secureHash = queryParams['vnp_SecureHash'];
  if (!secureHash) {
    console.log('[vnpay-verify]: No vnp_SecureHash found in query params.');
    return false;
  }

  const params = { ...queryParams };
  const sortedKeys = Object.keys(params).sort();
  
  // Lọc bỏ các phần tử rỗng, chỉ lấy tham số bắt đầu bằng vnp_ ngoại trừ SecureHash, thực hiện urlencode và thay thế khoảng trắng bằng '+'
  const signQuery = sortedKeys
    .filter(key => key.startsWith('vnp_') && key !== 'vnp_SecureHash' && key !== 'vnp_SecureHashType')
    .filter(key => params[key] !== undefined && params[key] !== null && params[key] !== '')
    .map(key => `${key}=${encodeURIComponent(params[key]).replace(/%20/g, '+')}`)
    .join('&');

  const checkHash = crypto
    .createHmac('sha512', config.vnpHashSecret)
    .update(Buffer.from(signQuery, 'utf-8'))
    .digest('hex');

  const isValid = checkHash.toLowerCase() === secureHash.toLowerCase();

  console.log('[vnpay-verify]: Detailed verification log:');
  console.log('  - Received params:', JSON.stringify(queryParams));
  console.log('  - Built signQuery:', signQuery);
  console.log('  - checkHash:     ', checkHash);
  console.log('  - secureHash:    ', secureHash);
  console.log('  - Match result:  ', isValid);

  return isValid;
}

/**
 * Gọi API đối soát (QueryDR) của VNPAY
 */
export async function queryTransactionStatus({
  orderCode,
  transactionDate,
  ipAddr,
}: {
  orderCode: string;
  transactionDate: string;
  ipAddr: string;
}): Promise<any> {
  const requestId = String(Date.now());
  const version = '2.1.0';
  const command = 'querydr';
  const tmnCode = config.vnpTmnCode;
  const createDate = getGMT7DateString(new Date());
  const orderInfo = `Truy van don hang ${orderCode}`;

  // Chuỗi hash: vnp_RequestId|vnp_Version|vnp_Command|vnp_TmnCode|vnp_TxnRef|vnp_TransactionDate|vnp_CreateDate|vnp_IpAddr|vnp_OrderInfo
  const hashData = `${requestId}|${version}|${command}|${tmnCode}|${orderCode}|${transactionDate}|${createDate}|${ipAddr}|${orderInfo}`;
  const secureHash = crypto
    .createHmac('sha512', config.vnpHashSecret)
    .update(Buffer.from(hashData, 'utf-8'))
    .digest('hex');

  const payload = {
    vnp_RequestId: requestId,
    vnp_Version: version,
    vnp_Command: command,
    vnp_TmnCode: tmnCode,
    vnp_TxnRef: orderCode,
    vnp_TransactionDate: transactionDate,
    vnp_CreateDate: createDate,
    vnp_IpAddr: ipAddr,
    vnp_OrderInfo: orderInfo,
    vnp_SecureHash: secureHash,
  };

  const response = await fetch(config.vnpApiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`VNPAY WebAPI responded with status ${response.status}`);
  }

  return response.json();
}

/**
 * Gửi yêu cầu hoàn tiền (Refund) tới cổng VNPAY
 */
export async function refundTransaction({
  orderCode,
  amount,
  transactionNo,
  transactionDate,
  createBy,
  ipAddr,
  transactionType = '03', // 02: hoàn tiền toàn phần, 03: hoàn tiền một phần
}: {
  orderCode: string;
  amount: number;
  transactionNo: string;
  transactionDate: string;
  createBy: string;
  ipAddr: string;
  transactionType?: string;
}): Promise<any> {
  const requestId = String(Date.now());
  const version = '2.1.0';
  const command = 'refund';
  const tmnCode = config.vnpTmnCode;
  const createDate = getGMT7DateString(new Date());
  const orderInfo = `Hoan tien don hang ${orderCode}`;
  const amountCent = String(Math.round(amount) * 100);

  // Chuỗi hash: vnp_RequestId|vnp_Version|vnp_Command|vnp_TmnCode|vnp_TransactionType|vnp_TxnRef|vnp_Amount|vnp_TransactionNo|vnp_TransactionDate|vnp_CreateBy|vnp_CreateDate|vnp_IpAddr|vnp_OrderInfo
  const hashData = `${requestId}|${version}|${command}|${tmnCode}|${transactionType}|${orderCode}|${amountCent}|${transactionNo}|${transactionDate}|${createBy}|${createDate}|${ipAddr}|${orderInfo}`;
  const secureHash = crypto
    .createHmac('sha512', config.vnpHashSecret)
    .update(Buffer.from(hashData, 'utf-8'))
    .digest('hex');

  const payload = {
    vnp_RequestId: requestId,
    vnp_Version: version,
    vnp_Command: command,
    vnp_TmnCode: tmnCode,
    vnp_TransactionType: transactionType,
    vnp_TxnRef: orderCode,
    vnp_Amount: amountCent,
    vnp_TransactionNo: transactionNo,
    vnp_TransactionDate: transactionDate,
    vnp_CreateBy: createBy,
    vnp_CreateDate: createDate,
    vnp_IpAddr: ipAddr,
    vnp_OrderInfo: orderInfo,
    vnp_SecureHash: secureHash,
  };

  const response = await fetch(config.vnpApiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`VNPAY WebAPI responded with status ${response.status}`);
  }

  return response.json();
}
