import express, { Request, Response } from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { authMiddleware } from '../auth.middleware';
import { roleGuard } from '../role.guard';
import { ownerGuard } from '../owner.guard';

const app = express();
app.use(express.json());

const secret = process.env.JWT_SECRET || 'super-secret-key-fallback';

// Dummy routes simulating features
app.get('/api/protected', authMiddleware, (req: Request, res: Response) => {
  res.status(200).json({ success: true, message: 'Protected info', data: req.user });
});

app.get('/api/admin-only', authMiddleware, roleGuard(['admin']), (req: Request, res: Response) => {
  res.status(200).json({ success: true, message: 'Admin page' });
});

app.put('/api/users/:id', authMiddleware, ownerGuard('id', false), (req: Request, res: Response) => {
  res.status(200).json({ success: true, message: 'Updated own profile' });
});

app.put('/api/vendors/:vendorId', authMiddleware, ownerGuard('vendorId', true), (req: Request, res: Response) => {
  res.status(200).json({ success: true, message: 'Updated own vendor' });
});

describe('Middlewares Test Suite', () => {

  describe('authMiddleware', () => {
    it('should 401 if missing token', async () => {
      const res = await request(app).get('/api/protected');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should 401 if token is invalid', async () => {
      const res = await request(app).get('/api/protected').set('Authorization', 'Bearer invalidtoken');
      expect(res.status).toBe(401);
    });

    it('should attach req.user and 200 if valid token', async () => {
      const token = jwt.sign({ id: 'uuid-1234', role: 'customer' }, secret);
      const res = await request(app).get('/api/protected').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe('uuid-1234');
    });
  });

  describe('roleGuard', () => {
    it('should 403 if role mismatch', async () => {
      const token = jwt.sign({ id: 'user-1', role: 'customer' }, secret);
      const res = await request(app).get('/api/admin-only').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    });

    it('should 200 if role matches', async () => {
      const token = jwt.sign({ id: 'admin-1', role: 'admin' }, secret);
      const res = await request(app).get('/api/admin-only').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });
  });

  describe('ownerGuard', () => {
    it('should 403 if trying to update wrong user id', async () => {
      const token = jwt.sign({ id: 'user-me', role: 'customer' }, secret);
      // trying to update 'user-other'
      const res = await request(app).put('/api/users/user-other').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    });

    it('should 200 if updating own user id', async () => {
      const token = jwt.sign({ id: 'user-me', role: 'customer' }, secret);
      const res = await request(app).put('/api/users/user-me').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });

    it('should 200 and bypass if role is admin', async () => {
      const token = jwt.sign({ id: 'admin-1', role: 'admin' }, secret);
      // admin user updating 'user-other'
      const res = await request(app).put('/api/users/user-other').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });

    it('should 200 if trying to update own vendor id', async () => {
      const token = jwt.sign({ id: 'user-me', role: 'vendor', vendor_id: 'vendor-123' }, secret);
      const res = await request(app).put('/api/vendors/vendor-123').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });

    it('should 403 if trying to update other vendor id', async () => {
      const token = jwt.sign({ id: 'user-me', role: 'vendor', vendor_id: 'vendor-123' }, secret);
      const res = await request(app).put('/api/vendors/vendor-other').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    });
  });
});
