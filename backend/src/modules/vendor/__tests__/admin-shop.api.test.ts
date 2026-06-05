import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import adminShopRoutes from '../admin-shop.route';

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

import db from '../../../core/db';

app.use('/api/admin/shops', adminShopRoutes);

describe('Admin Shop Oversight APIs Module', () => {
  let adminToken: string;
  let customerToken: string;

  beforeEach(() => {
    jest.clearAllMocks();
    adminToken = jwt.sign({ id: 'admin-uuid', role: 'admin' }, secret);
    customerToken = jwt.sign({ id: 'customer-uuid', role: 'customer' }, secret);
  });

  describe('Authorization and Role Checks', () => {
    it('should return 401 when no authorization header is provided', async () => {
      const res = await request(app).get('/api/admin/shops');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 403 when user is not an admin', async () => {
      const res = await request(app)
        .get('/api/admin/shops')
        .set('Authorization', `Bearer ${customerToken}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Permission denied');
    });
  });

  describe('GET /api/admin/shops', () => {
    it('should retrieve paginated shops with aggregated statistics', async () => {
      const mockShops = [
        {
          id: 'v-1',
          store_name: 'Tech Store',
          slug: 'tech-store',
          status: 'active',
          created_at: '2026-05-25T00:00:00.000Z',
          owner_name: 'John Doe',
          owner_email: 'john@example.com',
          products_count: 10,
          sales_amount: 5500.5,
        },
      ];

      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ total: 1 }] }) // total count query
        .mockResolvedValueOnce({ rows: mockShops }); // shops query

      const res = await request(app)
        .get('/api/admin/shops')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ page: 1, limit: 10 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.items[0].store_name).toBe('Tech Store');
      expect(res.body.data.items[0].products_count).toBe(10);
      expect(res.body.data.items[0].sales_amount).toBe(5500.5);
      expect(res.body.data.total).toBe(1);
      expect(res.body.data.total_pages).toBe(1);
    });

    it('should support status and search filters', async () => {
      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ total: 0 }] }) // total count query
        .mockResolvedValueOnce({ rows: [] }); // shops query

      const res = await request(app)
        .get('/api/admin/shops')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ status: 'banned', q: 'Tech' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toHaveLength(0);

      // Verify that filter parameter was injected in SQL search parameters
      const firstQueryCallArgs = (db.query as jest.Mock).mock.calls[0];
      expect(firstQueryCallArgs[1]).toContain('banned');
      expect(firstQueryCallArgs[1]).toContain('%Tech%');
    });
  });

  describe('PATCH /api/admin/shops/:id/status', () => {
    it('should return 400 when invalid status is provided', async () => {
      const res = await request(app)
        .patch('/api/admin/shops/v-1/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'invalid-status' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid status');
    });

    it('should return 404 when shop is not found', async () => {
      mockClient.query
        .mockResolvedValueOnce(null) // BEGIN
        .mockResolvedValueOnce({ rowCount: 0, rows: [] }); // select check FOR UPDATE

      const res = await request(app)
        .patch('/api/admin/shops/v-999/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'banned' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Shop not found');
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should update vendor and user status inside a transaction successfully', async () => {
      mockClient.query
        .mockResolvedValueOnce(null) // BEGIN
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'v-1', user_id: 'u-1' }] }) // SELECT
        .mockResolvedValueOnce({ rowCount: 1 }) // UPDATE vendors
        .mockResolvedValueOnce({ rowCount: 1 }) // UPDATE users
        .mockResolvedValueOnce(null); // COMMIT

      const res = await request(app)
        .patch('/api/admin/shops/v-1/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'banned' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Shop status updated successfully');
      
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');

      // Verify cascading updates
      const updateVendorCall = mockClient.query.mock.calls.find(call => 
        typeof call[0] === 'string' && call[0].includes('UPDATE vendors')
      );
      const updateUserCall = mockClient.query.mock.calls.find(call => 
        typeof call[0] === 'string' && call[0].includes('UPDATE users')
      );

      expect(updateVendorCall[1]).toEqual(['banned', 'v-1']);
      expect(updateUserCall[1]).toEqual(['banned', 'u-1']);
    });
  });

  describe('GET /api/admin/shops/:id/stats', () => {
    it('should return 404 when shop is not found', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({ rowCount: 0, rows: [] }); // check existence

      const res = await request(app)
        .get('/api/admin/shops/v-999/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Shop not found');
    });

    it('should return monthly revenue list, total orders, and calculate return rate', async () => {
      const mockMonthlyRevenue = [
        { month: '2026-05', revenue: 1000.0 },
        { month: '2026-04', revenue: 1500.5 },
      ];

      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'v-1' }] }) // existence check
        .mockResolvedValueOnce({ rows: mockMonthlyRevenue }) // revenue by month
        .mockResolvedValueOnce({ rows: [{ count: 12 }] }) // order count query
        .mockResolvedValueOnce({ rows: [{ total_items: 200, return_items: 5 }] }); // return items query

      const res = await request(app)
        .get('/api/admin/shops/v-1/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      
      const stats = res.body.data;
      expect(stats.revenue_by_month).toHaveLength(2);
      expect(stats.revenue_by_month[0].revenue).toBe(1000.0);
      expect(stats.order_count).toBe(12);
      
      // return rate calculation: (5 / 200) * 100 = 2.5
      expect(stats.return_rate).toBe(2.5);
    });

    it('should handle zero order items return rate calculations gracefully', async () => {
      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'v-1' }] }) // existence check
        .mockResolvedValueOnce({ rows: [] }) // revenue
        .mockResolvedValueOnce({ rows: [{ count: 0 }] }) // orders
        .mockResolvedValueOnce({ rows: [{ total_items: 0, return_items: 0 }] }); // return rate

      const res = await request(app)
        .get('/api/admin/shops/v-1/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.return_rate).toBe(0.0);
    });
  });
});
