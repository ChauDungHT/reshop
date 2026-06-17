import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';

// Variables prefixed with 'mock' are hoisted by Jest and safe to use in jest.mock
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

import checkoutRoutes from '../checkout.route';

const app = express();
app.use(express.json());
const secret = process.env.JWT_SECRET || 'super-secret-key-fallback';

app.use('/api/checkout', checkoutRoutes);

describe('Checkout API Wallet checks', () => {
  let token: string;
  const userId = 'user-uuid-1234';

  beforeEach(() => {
    jest.clearAllMocks();
    token = jwt.sign({ id: userId, role: 'customer' }, secret);
  });

  it('should successfully checkout using wallet when user exists, is active, and has sufficient balance', async () => {
    // Mock database responses
    mockQuery
      .mockResolvedValueOnce({ rows: [] }) // BEGIN transaction
      .mockResolvedValueOnce({
        rows: [{ id: 'prod-1', name: 'Product 1', price: '100000.00', stock: 5, vendor_id: 'vendor-1' }]
      }) // Product lookup
      .mockResolvedValueOnce({ rows: [] }) // Update stock
      .mockResolvedValueOnce({ rows: [{ id: 'order-1' }] }) // Insert order
      .mockResolvedValueOnce({
        rows: [{ status: 'active', wallet_balance: '150000.00' }]
      }) // Get user wallet balance & status FOR UPDATE
      .mockResolvedValueOnce({ rows: [] }) // Update user balance
      .mockResolvedValueOnce({ rows: [] }) // Insert wallet transaction
      .mockResolvedValueOnce({ rows: [{ id: 'sub-order-1' }] }) // Insert sub order
      .mockResolvedValueOnce({ rows: [] }) // Insert order item
      .mockResolvedValueOnce({ rows: [] }) // Delete from cart_items
      .mockResolvedValueOnce({ rows: [] }); // COMMIT

    const res = await request(app)
      .post('/api/checkout')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [{ product_id: 'prod-1', quantity: 1 }],
        shipping_address: { name: 'Test User', phone: '0987654321', address: '123 St', shipping_method: 'standard' },
        payment_method: 'wallet'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.order_id).toBe('order-1');
  });

  it('should fail checkout when user does not exist in the database', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({
        rows: [{ id: 'prod-1', name: 'Product 1', price: '100000.00', stock: 5, vendor_id: 'vendor-1' }]
      }) // Product lookup
      .mockResolvedValueOnce({ rows: [] }) // Update stock
      .mockResolvedValueOnce({ rows: [{ id: 'order-1' }] }) // Insert order
      .mockResolvedValueOnce({ rows: [] }) // Get user FOR UPDATE (returns no rows, i.e., user not found)
      .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

    const res = await request(app)
      .post('/api/checkout')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [{ product_id: 'prod-1', quantity: 1 }],
        shipping_address: { name: 'Test User', phone: '0987654321', address: '123 St', shipping_method: 'standard' },
        payment_method: 'wallet'
      });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Không tìm thấy thông tin tài khoản người dùng.');
  });

  it('should fail checkout when user status is not active (e.g., banned)', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({
        rows: [{ id: 'prod-1', name: 'Product 1', price: '100000.00', stock: 5, vendor_id: 'vendor-1' }]
      }) // Product lookup
      .mockResolvedValueOnce({ rows: [] }) // Update stock
      .mockResolvedValueOnce({ rows: [{ id: 'order-1' }] }) // Insert order
      .mockResolvedValueOnce({
        rows: [{ status: 'banned', wallet_balance: '150000.00' }]
      }) // Get user wallet balance & status FOR UPDATE (user is banned)
      .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

    const res = await request(app)
      .post('/api/checkout')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [{ product_id: 'prod-1', quantity: 1 }],
        shipping_address: { name: 'Test User', phone: '0987654321', address: '123 St', shipping_method: 'standard' },
        payment_method: 'wallet'
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Tài khoản hoặc ví của bạn đã bị khóa hoặc chưa kích hoạt.');
  });

  it('should fail checkout when user has insufficient wallet balance', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({
        rows: [{ id: 'prod-1', name: 'Product 1', price: '100000.00', stock: 5, vendor_id: 'vendor-1' }]
      }) // Product lookup
      .mockResolvedValueOnce({ rows: [] }) // Update stock
      .mockResolvedValueOnce({ rows: [{ id: 'order-1' }] }) // Insert order
      .mockResolvedValueOnce({
        rows: [{ status: 'active', wallet_balance: '5000.00' }]
      }) // Get user wallet balance & status FOR UPDATE (balance < 120000 (100k + 20k standard ship fee))
      .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

    const res = await request(app)
      .post('/api/checkout')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [{ product_id: 'prod-1', quantity: 1 }],
        shipping_address: { name: 'Test User', phone: '0987654321', address: '123 St', shipping_method: 'standard' },
        payment_method: 'wallet'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Số dư ví không đủ để thanh toán.');
  });
});
