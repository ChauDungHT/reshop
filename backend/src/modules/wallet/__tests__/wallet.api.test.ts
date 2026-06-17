import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';

const mockQuery = jest.fn();
const mockRelease = jest.fn();

jest.mock('../../../core/db', () => ({
  __esModule: true,
  default: {
    pool: {
      connect: jest.fn().mockResolvedValue({
        query: mockQuery,
        release: mockRelease
      })
    },
    query: jest.fn()
  }
}));

import walletRoutes from '../wallet.route';

const app = express();
app.use(express.json());
const secret = process.env.JWT_SECRET || 'super-secret-key-fallback';

app.use('/api/wallet', walletRoutes);

describe('Wallet API - Withdrawals', () => {
  let token: string;
  const userId = 'user-uuid-9999';

  beforeEach(() => {
    jest.clearAllMocks();
    token = jwt.sign({ id: userId, role: 'vendor' }, secret);
  });

  it('should successfully submit withdrawal when user is active and has sufficient balance', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({
        rows: [{ status: 'active', wallet_balance: '150000.00' }]
      }) // Select user details FOR UPDATE
      .mockResolvedValueOnce({ rows: [] }) // Update user balance
      .mockResolvedValueOnce({
        rows: [{ id: 'tx-withdraw-123', created_at: new Date().toISOString() }]
      }) // Insert transaction
      .mockResolvedValueOnce({ rows: [] }); // COMMIT

    const res = await request(app)
      .post('/api/wallet/withdraw')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 50000 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.new_balance).toBe(100000);
    expect(res.body.data.transaction_id).toBe('tx-withdraw-123');
  });

  it('should fail withdrawal request when no authentication is provided', async () => {
    const res = await request(app)
      .post('/api/wallet/withdraw')
      .send({ amount: 50000 });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should fail withdrawal request when amount is zero or negative', async () => {
    const res = await request(app)
      .post('/api/wallet/withdraw')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: -500 });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Số tiền rút không hợp lệ');
  });

  it('should fail withdrawal request when user is not found in database', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [] }) // Select user details (no rows)
      .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

    const res = await request(app)
      .post('/api/wallet/withdraw')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 50000 });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Không tìm thấy người dùng');
  });

  it('should fail withdrawal request when user status is not active', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({
        rows: [{ status: 'banned', wallet_balance: '150000.00' }]
      }) // Select user details (banned)
      .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

    const res = await request(app)
      .post('/api/wallet/withdraw')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 50000 });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Tài khoản của bạn đã bị khóa');
  });

  it('should fail withdrawal request when user has insufficient balance', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({
        rows: [{ status: 'active', wallet_balance: '1000.00' }]
      }) // Select user details
      .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

    const res = await request(app)
      .post('/api/wallet/withdraw')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 50000 });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Số dư ví khả dụng không đủ');
  });
});
