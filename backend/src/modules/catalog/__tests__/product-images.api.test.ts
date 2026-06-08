import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import productRoutes from '../product.route';

const app = express();
app.use(express.json());
const secret = process.env.JWT_SECRET || 'super-secret-key-fallback';

// Mock Multer
jest.mock('multer', () => {
  const multer = () => ({
    array: () => {
      return (req: any, res: any, next: any) => {
        req.files = [
          {
            originalname: 'product-image-test.jpg',
            mimetype: 'image/jpeg',
            buffer: Buffer.from('mocking-product-image'),
            size: 1024
          }
        ];
        next();
      };
    },
    single: () => {
      return (req: any, res: any, next: any) => {
        req.file = {
          originalname: 'test.jpg',
          mimetype: 'image/jpeg',
          buffer: Buffer.from('mocking-avatar'),
          size: 1024
        };
        next();
      };
    }
  });
  multer.memoryStorage = () => jest.fn();
  return multer;
});

jest.mock('../../../core/db', () => ({
  __esModule: true,
  default: {
    query: jest.fn()
  }
}));

import db from '../../../core/db';

app.use('/api/products', productRoutes);

describe('Product Images API', () => {
  let token: string;
  let nonVendorToken: string;

  beforeEach(() => {
    jest.clearAllMocks();
    token = jwt.sign({ id: 'vendor-user-uuid', role: 'vendor', vendor_id: 'vendor-uuid' }, secret);
    nonVendorToken = jwt.sign({ id: 'customer-user-uuid', role: 'customer' }, secret);
  });

  describe('POST /api/products/:id/images', () => {
    it('should return 401 if unauthorized', async () => {
      const res = await request(app).post('/api/products/prod-123/images');
      expect(res.status).toBe(401);
    });

    it('should return 403 if user is not a vendor', async () => {
      const res = await request(app)
        .post('/api/products/prod-123/images')
        .set('Authorization', `Bearer ${nonVendorToken}`);
      expect(res.status).toBe(403);
    });

    it('should return 404 if product not found', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] }); // product search

      const res = await request(app)
        .post('/api/products/prod-123/images')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });

    it('should return 403 if vendor does not own product', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [{ vendor_id: 'other-vendor-uuid' }] });

      const res = await request(app)
        .post('/api/products/prod-123/images')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });

    it('should upload image and return 201 on success', async () => {
      // 1. mock product check
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [{ vendor_id: 'vendor-uuid' }] });
      // 2. mock existing image count check
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [{ count: '0' }] });
      // 3. mock primary check
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });
      // 4. mock insert query
      const mockImage = {
        id: 'img-uuid-1',
        product_id: 'prod-123',
        url: '/uploads/products/vendor-uuid/prod-123/main_xyz.webp',
        is_primary: true,
        display_order: 0
      };
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [mockImage] });

      const res = await request(app)
        .post('/api/products/prod-123/images')
        .set('Authorization', `Bearer ${token}`)
        .send();

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data[0].id).toBe('img-uuid-1');
      expect(res.body.data[0].is_primary).toBe(true);
    });
  });

  describe('DELETE /api/products/:id/images/:imageId', () => {
    it('should return 401 if unauthorized', async () => {
      const res = await request(app).delete('/api/products/prod-123/images/img-uuid-1');
      expect(res.status).toBe(401);
    });

    it('should return 403 if user is not a vendor', async () => {
      const res = await request(app)
        .delete('/api/products/prod-123/images/img-uuid-1')
        .set('Authorization', `Bearer ${nonVendorToken}`);
      expect(res.status).toBe(403);
    });

    it('should return 404 if product not found', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] }); // product search

      const res = await request(app)
        .delete('/api/products/prod-123/images/img-uuid-1')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });

    it('should return 403 if vendor does not own product', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [{ vendor_id: 'other-vendor-uuid' }] });

      const res = await request(app)
        .delete('/api/products/prod-123/images/img-uuid-1')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });

    it('should return 404 if image does not exist', async () => {
      // 1. mock product check
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [{ vendor_id: 'vendor-uuid' }] });
      // 2. mock image check (empty)
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .delete('/api/products/prod-123/images/img-uuid-1')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });

    it('should delete image and return 200 on success', async () => {
      // 1. mock product check
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [{ vendor_id: 'vendor-uuid' }] });
      // 2. mock image check
      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ id: 'img-uuid-1', url: '/uploads/products/vendor-uuid/prod-123/main_xyz.webp', is_primary: true }]
      });
      // 3. mock delete
      (db.query as jest.Mock).mockResolvedValueOnce({});
      // 4. mock other image check for primary promotion
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: 'img-uuid-2' }] });
      // 5. mock update primary
      (db.query as jest.Mock).mockResolvedValueOnce({});

      const res = await request(app)
        .delete('/api/products/prod-123/images/img-uuid-1')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
