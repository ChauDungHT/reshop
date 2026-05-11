import dotenv from 'dotenv';
dotenv.config();

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
  databaseUrl: requireEnv('DATABASE_URL'),
  port: process.env.PORT ? parseInt(process.env.PORT, 10) : 8000,
};
