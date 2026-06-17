import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../../.env') });

/**
 * Đọc biến môi trường bắt buộc.
 * Nếu thiếu → crash ngay khi khởi động, không để server chạy với config không an toàn.
 */
function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`[config]: Missing required environment variable: ${key}`);
  }
  return value;
}

export const config = {
  jwtSecret: requireEnv('JWT_SECRET'),
  databaseUrl: process.env.DATABASE_URL || 
    `postgres://${process.env.POSTGRES_USER || 'postgres'}:${process.env.POSTGRES_PASSWORD || 'password'}@localhost:5433/${process.env.POSTGRES_DB || 'cdshop'}`,
  port: process.env.PORT ? parseInt(process.env.PORT, 10) : 8000,
  vnpTmnCode: process.env.VNP_TMN_CODE || 'NKKFNQR2',
  vnpHashSecret: process.env.VNP_HASH_SECRET || 'BSTSEN2NTVPOVL0FWO50DO14U61S46SD',
  vnpUrl: process.env.VNP_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
  vnpReturnUrl: process.env.VNP_RETURN_URL || 'http://localhost:5173/payment/return',
  vnpApiUrl: process.env.VNP_API_URL || 'https://merchant.vnpay.vn/merchant_webapi/api/transaction',
};
