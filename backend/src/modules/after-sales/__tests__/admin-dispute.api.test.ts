import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import adminDisputeRoutes from '../admin-dispute.route';

const app = express();
app.use(express.json());
const secret = process.env.JWT_SECRET || 'super-secret-key-fallback';

const mockClient = {
  query: jest.fn(),
  release: jest.fn(),
};

jest.mock('../../../core/db', () => ({
  __esModule: true,
  default: {
    query: jest.fn(),
    pool: {
      connect: jest.fn(() => Promise.resolve(mockClient)),
    },
  },
}));

jest.mock('../../../shared/fee-calculator', () => ({
  calculateVendorFee: jest.fn((client, vendorId, grossAmount) => {
    const calculatedFee = parseFloat((grossAmount * 0.05).toFixed(2));
    return Promise.resolve({
      totalFee: calculatedFee,
      netAmount: parseFloat((grossAmount - calculatedFee).toFixed(2)),
      breakdown: [
        {
          fee_name: 'Phí sàn phần trăm (mock)',
          fee_type: 'percentage',
          fee_value: 5.0,
          calculated_amount: calculatedFee,
        },
      ],
    });
  }),
}));

import db from '../../../core/db';

app.use('/api/admin/disputes', adminDisputeRoutes);

describe('Admin Dispute Resolution APIs Module', () => {
  let adminToken: string;
  let customerToken: string;

  beforeEach(() => {
    mockClient.query.mockReset();
    jest.clearAllMocks();
    adminToken = jwt.sign({ id: 'admin-uuid', role: 'admin' }, secret);
    customerToken = jwt.sign({ id: 'customer-uuid', role: 'customer' }, secret);
  });

  describe('Authorization & Access Guards', () => {
    it('should return 401 when missing authentication header', async () => {
      const res = await request(app).get('/api/admin/disputes');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 403 when user role is customer', async () => {
      const res = await request(app)
        .get('/api/admin/disputes')
        .set('Authorization', `Bearer ${customerToken}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Permission denied');
    });
  });

  describe('GET /api/admin/disputes', () => {
    it('should return all escalated disputes with joined information', async () => {
      const mockDisputes = [
        {
          id: 'dis-1',
          reason: 'Broken item',
          description: 'Screen was cracked upon delivery',
          status: 'escalated',
          buyer_name: 'Jane Customer',
          store_name: 'Tech Seller',
          order_code: 'ORD-12345',
          price_snapshot: 99.9,
          quantity: 1,
          product_name: 'Smart Watch',
        },
      ];

      (db.query as jest.Mock).mockResolvedValueOnce({ rows: mockDisputes });

      const res = await request(app)
        .get('/api/admin/disputes')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].buyer_name).toBe('Jane Customer');
      expect(res.body.data[0].store_name).toBe('Tech Seller');
      expect(res.body.data[0].product_name).toBe('Smart Watch');
      expect(res.body.data[0].price_snapshot).toBe(99.9);
      expect(db.query).toHaveBeenCalledTimes(1);
    });
  });

  describe('POST /api/admin/disputes/:id/resolve', () => {
    it('should return 400 when winner option is invalid', async () => {
      const res = await request(app)
        .post('/api/admin/disputes/dis-1/resolve')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ winner: 'system', admin_notes: 'Notes' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Winner must be');
    });

    it('should return 400 when admin notes is empty', async () => {
      const res = await request(app)
        .post('/api/admin/disputes/dis-1/resolve')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ winner: 'customer', admin_notes: ' ' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Admin notes are required');
    });

    it('should return 404 when dispute is not found', async () => {
      mockClient.query
        .mockResolvedValueOnce(null) // BEGIN
        .mockResolvedValueOnce({ rowCount: 0, rows: [] }); // SELECT check FOR UPDATE

      const res = await request(app)
        .post('/api/admin/disputes/dis-999/resolve')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ winner: 'customer', admin_notes: 'Not found' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Dispute not found');
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should return 400 when dispute is already resolved', async () => {
      mockClient.query
        .mockResolvedValueOnce(null) // BEGIN
        .mockResolvedValueOnce({ 
          rowCount: 1, 
          rows: [{ id: 'dis-1', status: 'resolved_admin' }] 
        }); // SELECT check

      const res = await request(app)
        .post('/api/admin/disputes/dis-1/resolve')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ winner: 'customer', admin_notes: 'Already done' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Dispute is not in escalated status');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should execute complete transactional customer refund path successfully', async () => {
      const disputeDetails = {
        id: 'dis-1',
        status: 'escalated',
        buyer_id: 'buyer-u',
        order_id: 'ord-u',
        quantity: 2,
        price_snapshot: 15.0,
        product_id: 'prod-u',
        vendor_id: 'vend-u',
      };

      mockClient.query
        .mockResolvedValueOnce(null) // BEGIN
        .mockResolvedValueOnce({ rowCount: 1, rows: [disputeDetails] }) // SELECT Check
        .mockResolvedValueOnce({ rows: [{ user_id: 'vendor-u-id', commission_rate: '5.0' }] }) // SELECT Vendors
        .mockResolvedValueOnce({ rowCount: 1 }) // UPDATE Return Request
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ balance: 120.0 }] }) // UPDATE Users wallet (buyer)
        .mockResolvedValueOnce({ rowCount: 1 }) // INSERT wallet_transactions (buyer refund)
        .mockResolvedValueOnce({ rows: [{ wallet_balance: '500.00' }] }) // UPDATE users pending_balance (vendor)
        .mockResolvedValueOnce({ rowCount: 1 }) // INSERT wallet_transactions (vendor pending_release)
        .mockResolvedValueOnce({ rowCount: 1 }) // UPDATE sub_orders
        .mockResolvedValueOnce({ rowCount: 1 }) // UPDATE product stock
        .mockResolvedValueOnce({ rowCount: 1 }) // UPDATE order status
        .mockResolvedValueOnce(null); // COMMIT

      const res = await request(app)
        .post('/api/admin/disputes/dis-1/resolve')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ winner: 'customer', admin_notes: 'Customer wins refund' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('resolved successfully in favor of customer');

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');

      // Verify wallet update refund calculation: 2 * 15 = 30.0
      const walletUpdateCall = mockClient.query.mock.calls.find(call => 
        typeof call[0] === 'string' && call[0].includes('UPDATE users') && call[0].includes('wallet_balance = wallet_balance')
      );
      expect(walletUpdateCall[1]).toEqual([30.0, 'buyer-u']);

      // Verify wallet transaction logs balance_after: 120.0
      const transactionCall = mockClient.query.mock.calls.find(call => 
        typeof call[0] === 'string' && call[0].includes('INSERT INTO wallet_transactions') && call[0].includes("'refund'")
      );
      expect(transactionCall[1]).toEqual(['buyer-u', 30.0, 'ord-u', 120.0]);

      // Verify product stock incremented by: 2
      const stockCall = mockClient.query.mock.calls.find(call => 
        typeof call[0] === 'string' && call[0].includes('UPDATE products')
      );
      expect(stockCall[1]).toEqual([2, 'prod-u']);

      // Verify order status set to returned
      const orderCall = mockClient.query.mock.calls.find(call => 
        typeof call[0] === 'string' && call[0].includes('status = \'returned\'')
      );
      expect(orderCall[1]).toEqual(['ord-u']);
    });

    it('should execute transactional vendor path maintaining order status successfully', async () => {
      const disputeDetails = {
        id: 'dis-1',
        status: 'escalated',
        buyer_id: 'buyer-u',
        order_id: 'ord-u',
        quantity: 2,
        price_snapshot: 15.0,
        product_id: 'prod-u',
        vendor_id: 'vend-u',
      };

      mockClient.query
        .mockResolvedValueOnce(null) // BEGIN
        .mockResolvedValueOnce({ rowCount: 1, rows: [disputeDetails] }) // SELECT Check
        .mockResolvedValueOnce({ rows: [{ user_id: 'vendor-u-id', commission_rate: '5.0' }] }) // SELECT Vendors
        .mockResolvedValueOnce({ rowCount: 1 }) // UPDATE Return Request
        .mockResolvedValueOnce({ rows: [{ wallet_balance: '690.00' }] }) // UPDATE users pending_balance & wallet_balance (vendor)
        .mockResolvedValueOnce({ rowCount: 1 }) // INSERT wallet_transactions (vendor pending_release)
        .mockResolvedValueOnce({ rowCount: 1 }) // UPDATE sub_orders feedback_status
        .mockResolvedValueOnce({ rowCount: 1 }) // UPDATE order status to delivered
        .mockResolvedValueOnce(null); // COMMIT

      const res = await request(app)
        .post('/api/admin/disputes/dis-1/resolve')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ winner: 'vendor', admin_notes: 'Vendor wins delivered' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('resolved successfully in favor of vendor');

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');

      // Verify order status updated to delivered
      const orderCall = mockClient.query.mock.calls.find(call => 
        typeof call[0] === 'string' && call[0].includes('status = \'delivered\'')
      );
      expect(orderCall[1]).toEqual(['ord-u']);
    });

    it('should ROLLBACK and return 500 when wallet balance increment fails in transaction', async () => {
      const disputeDetails = {
        id: 'dis-1',
        status: 'escalated',
        buyer_id: 'buyer-u',
        order_id: 'ord-u',
        quantity: 2,
        price_snapshot: 15.0,
        product_id: 'prod-u',
        vendor_id: 'vend-u',
      };

      mockClient.query
        .mockResolvedValueOnce(null) // BEGIN
        .mockResolvedValueOnce({ rowCount: 1, rows: [disputeDetails] }) // SELECT Check
        .mockResolvedValueOnce({ rows: [{ user_id: 'vendor-u-id', commission_rate: '5.0' }] }) // SELECT Vendors
        .mockResolvedValueOnce({ rowCount: 1 }) // UPDATE Return Request
        .mockRejectedValueOnce(new Error('DB Connection Interrupted')); // Wallet query FAILS!

      const res = await request(app)
        .post('/api/admin/disputes/dis-1/resolve')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ winner: 'customer', admin_notes: 'Fails' });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Internal Server Error');
      
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });
});
