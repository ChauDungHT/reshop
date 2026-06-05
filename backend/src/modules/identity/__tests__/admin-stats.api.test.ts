import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import adminUserRoutes from '../admin-user.route';

const app = express();
app.use(express.json());
const secret = process.env.JWT_SECRET || 'super-secret-key-fallback';

jest.mock('../../../core/db', () => ({
  __esModule: true,
  default: {
    query: jest.fn(),
  },
}));

import db from '../../../core/db';

app.use('/api/admin', adminUserRoutes);

describe('Admin Statistics and Analytics APIs Module', () => {
  let adminToken: string;
  let customerToken: string;

  beforeEach(() => {
    jest.clearAllMocks();
    adminToken = jwt.sign({ id: 'admin-uuid', role: 'admin' }, secret);
    customerToken = jwt.sign({ id: 'customer-uuid', role: 'customer' }, secret);
  });

  describe('Authorization and Guards checks', () => {
    it('should return 401 when authorization header is missing', async () => {
      const res = await request(app).get('/api/admin/dashboard/stats');
      expect(res.status).toBe(401);
    });

    it('should return 403 when authenticated as customer', async () => {
      const res = await request(app)
        .get('/api/admin/dashboard/stats')
        .set('Authorization', `Bearer ${customerToken}`);
      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/admin/dashboard/stats', () => {
    it('should retrieve overall platform performance metrics and return 200', async () => {
      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ total_revenue: 125000000 }] }) // total revenue
        .mockResolvedValueOnce({ rows: [{ count: 10 }] }) // new orders today
        .mockResolvedValueOnce({ rows: [{ orders_today: 15 }] }) // orders today (comp)
        .mockResolvedValueOnce({ rows: [{ active_users: 1420 }] }) // active users
        .mockResolvedValueOnce({ rows: [{ active_vendors: 45 }] }) // active vendors
        .mockResolvedValueOnce({ rows: [{ total_products: 800 }] }) // total products
        .mockResolvedValueOnce({ rows: [{ active_products: 680 }] }) // active products (comp)
        .mockResolvedValueOnce({ rows: [
          { id: 'v1', store_name: 'Store Alpha', slug: 'store-alpha', revenue: 95000000 },
          { id: 'v2', store_name: 'Store Beta', slug: 'store-beta', revenue: 30000000 }
        ] }) // top shops
        .mockResolvedValueOnce({ rows: [
          { id: 'p1', name: 'Product A', sales_count: 50, sales_amount: 15000000 },
          { id: 'p2', name: 'Product B', sales_count: 30, sales_amount: 9000000 }
        ] }); // top products

      const res = await request(app)
        .get('/api/admin/dashboard/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.total_revenue).toBe(125000000);
      expect(res.body.data.new_orders_today).toBe(10);
      expect(res.body.data.orders_today).toBe(15);
      expect(res.body.data.active_users).toBe(1420);
      expect(res.body.data.active_vendors).toBe(45);
      expect(res.body.data.total_products).toBe(800);
      expect(res.body.data.active_products).toBe(680);
      expect(res.body.data.top_shops).toHaveLength(2);
      expect(res.body.data.top_products).toHaveLength(2);
    });
  });

  describe('GET /api/admin/dashboard/charts', () => {
    it('should retrieve history charts and status distributions and return 200', async () => {
      const mockTrend = [
        { date: '2026-05-18', revenue: 15000000, orders_count: 8 },
        { date: '2026-05-19', revenue: 22000000, orders_count: 12 },
      ];
      const mockDistribution = [
        { status: 'delivered', count: 45 },
        { status: 'pending', count: 12 },
      ];
      const mockTopShops = [
        { id: 'v1', store_name: 'Store Alpha', slug: 'store-alpha', revenue: 95000000 }
      ];
      const mockTopProducts = [
        { id: 'p1', name: 'Product A', sales_count: 50, sales_amount: 15000000 }
      ];

      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: mockTrend })
        .mockResolvedValueOnce({ rows: mockDistribution })
        .mockResolvedValueOnce({ rows: mockTopShops })
        .mockResolvedValueOnce({ rows: mockTopProducts });

      const res = await request(app)
        .get('/api/admin/dashboard/charts?range=7d')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.trend).toHaveLength(2);
      expect(res.body.data.distribution).toHaveLength(2);
      expect(res.body.data.top_shops).toHaveLength(1);
      expect(res.body.data.top_products).toHaveLength(1);
      expect(res.body.data.trend[0].revenue).toBe(15000000);
    });
  });

  describe('GET /api/admin/reports/orders/export', () => {
    it('should export orders to CSV format and return 200 with proper headers', async () => {
      const mockOrders = [
        {
          Date: '2026-05-18 06:51:02',
          Code: 'ORD-1',
          Shop: 'Store Alpha',
          Total: 150000,
          Status: 'delivered',
        },
        {
          Date: '2026-05-19 12:00:00',
          Code: 'ORD-2',
          Shop: 'Store Beta',
          Total: 250000,
          Status: 'pending',
        }
      ];

      (db.query as jest.Mock).mockResolvedValueOnce({ rows: mockOrders });

      const res = await request(app)
        .get('/api/admin/reports/orders/export?startDate=2026-05-01&endDate=2026-05-30')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.header['content-type']).toContain('text/csv');
      expect(res.header['content-disposition']).toBe('attachment; filename=orders_report.csv');
      
      const csvText = res.text;
      expect(csvText).toContain('Date,Code,Shop,Total,Status');
      expect(csvText).toContain('"2026-05-18 06:51:02","ORD-1","Store Alpha","150000","delivered"');
      expect(csvText).toContain('"2026-05-19 12:00:00","ORD-2","Store Beta","250000","pending"');
    });
  });
});
