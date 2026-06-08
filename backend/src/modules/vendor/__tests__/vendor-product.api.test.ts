import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import vendorRoutes from '../vendor.route';

const app = express();
app.use(express.json());
const secret = process.env.JWT_SECRET || 'super-secret-key-fallback';

jest.mock('../../../core/db', () => ({
  __esModule: true,
  default: {
    query: jest.fn(),
    pool: {
      connect: jest.fn(() => ({
        query: jest.fn(),
        release: jest.fn()
      }))
    }
  }
}));

import db from '../../../core/db';

app.use('/api/vendor', vendorRoutes);

describe('Vendor Product API', () => {
  let token: string;

  beforeEach(() => {
    jest.clearAllMocks();
    token = jwt.sign({ id: 'vendor-user-uuid', role: 'vendor', vendor_id: 'vendor-uuid' }, secret);
  });

  describe('DELETE /api/vendor/products/bulk', () => {
    it('should return 401 if unauthorized', async () => {
      const res = await request(app).delete('/api/vendor/products/bulk');
      expect(res.status).toBe(401);
    });

    it('should return 400 if invalid product IDs list', async () => {
      const res = await request(app)
        .delete('/api/vendor/products/bulk')
        .set('Authorization', `Bearer ${token}`)
        .send({ ids: 'not-an-array' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 409 if products have pending orders', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ name: 'Conflicting Product' }]
      });

      const res = await request(app)
        .delete('/api/vendor/products/bulk')
        .set('Authorization', `Bearer ${token}`)
        .send({ ids: ['prod-123'] });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.data.conflicting_products).toContain('Conflicting Product');
    });

    it('should return 200 and soft delete products and delete product images on success', async () => {
      // 1. mock no pending orders
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });
      // 2. mock soft delete products
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });
      // 3. mock delete product_images from DB
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .delete('/api/vendor/products/bulk')
        .set('Authorization', `Bearer ${token}`)
        .send({ ids: ['prod-123', 'prod-456'] });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
